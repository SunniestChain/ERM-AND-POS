use actix_web::{web, HttpResponse};
use serde_json::json;


use crate::error::AppError;
use crate::supabase::SupabaseClient;

/// GET /api/inventory/export
pub async fn export_inventory(
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let select = "price,stock_quantity,bin_location,sku,product:products(part_number,name,description,notes,image_url,reference_numbers,category:categories(name)),supplier:suppliers(name)";

    let data = sb.query("product_variants", select, &[]).await?;

    let empty_vec = vec![];
    let rows = data.as_array().unwrap_or(&empty_vec);

    // Build CSV
    let mut wtr = csv::Writer::from_writer(vec![]);

    // Header
    wtr.write_record(&[
        "PartNumber",
        "Manufacturer",
        "Engine",
        "Category",
        "Supplier",
        "Description",
        "Price",
        "Stock",
        "Bin",
        "Image",
        "SKU",
        "Notes",
        "ReferenceNumbers",
    ])
    .map_err(|e| AppError::internal(e.to_string()))?;

    for v in rows {
        let product = &v["product"];
        wtr.write_record(&[
            product["part_number"].as_str().unwrap_or(""),
            "", // Manufacturer - not directly available in this join path
            "", // Engine - not directly available
            product["category"]["name"].as_str().unwrap_or(""),
            v["supplier"]["name"].as_str().unwrap_or(""),
            product["description"].as_str().unwrap_or(""),
            &v["price"].as_f64().unwrap_or(0.0).to_string(),
            &v["stock_quantity"].as_i64().unwrap_or(0).to_string(),
            v["bin_location"].as_str().unwrap_or(""),
            product["image_url"].as_str().unwrap_or(""),
            v["sku"].as_str().unwrap_or(""),
            product["notes"].as_str().unwrap_or(""),
            product["reference_numbers"].as_str().unwrap_or(""),
        ])
        .map_err(|e| AppError::internal(e.to_string()))?;
    }

    let csv_data = String::from_utf8(
        wtr.into_inner().map_err(|e| AppError::internal(e.to_string()))?,
    )
    .map_err(|e| AppError::internal(e.to_string()))?;

    Ok(HttpResponse::Ok()
        .content_type("text/csv")
        .insert_header(("Content-Disposition", "attachment; filename=\"inventory_export.csv\""))
        .body(csv_data))
}

/// POST /api/inventory/import
pub async fn import_inventory(
    body: String,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let csv_data = body;
    if csv_data.is_empty() {
        return Err(AppError::bad_request("No CSV data received"));
    }

    let lines: Vec<&str> = csv_data.split('\n').collect();
    if lines.len() < 2 {
        return Ok(HttpResponse::Ok().json(json!({ "message": "Empty/Invalid CSV" })));
    }

    // Parse headers
    let headers: Vec<String> = lines[0]
        .split(',')
        .map(|h| h.trim().trim_matches('"').to_lowercase())
        .collect();

    // Map headers to indices
    let find_idx = |names: &[&str]| -> Option<usize> {
        headers.iter().position(|h| names.contains(&h.as_str()))
    };

    let idx_part_number = find_idx(&["partnumber", "part number"]);
    let idx_manufacturer = find_idx(&["manufacturer"]);
    let idx_engine = find_idx(&["engine"]);
    let idx_category = find_idx(&["category"]);
    let idx_supplier = find_idx(&["supplier", "brand"]);
    let idx_description = find_idx(&["description", "productname", "name"]);
    let idx_price = find_idx(&["price"]);
    let idx_quantity = find_idx(&["quantity", "stock", "qty"]);
    let idx_bin = find_idx(&["binlocation", "bin"]);
    let idx_image = find_idx(&["image"]);
    let idx_sku = find_idx(&["sku"]);
    let idx_notes = find_idx(&["notes"]);
    let idx_ref_numbers = find_idx(&["referencenumbers", "reference", "refs"]);

    if idx_part_number.is_none() || idx_supplier.is_none() {
        return Err(AppError::bad_request(
            "CSV must contain PartNumber and Supplier columns",
        ));
    }

    let idx_pn = idx_part_number.unwrap();
    let idx_sup = idx_supplier.unwrap();

    // RESET PHASE: Wipe all data
    let _ = sb.delete("sale_items", &[("id", "neq.0")]).await;
    let _ = sb.delete("sales", &[("id", "neq.0")]).await;
    let _ = sb.delete("product_variants", &[("id", "neq.0")]).await;
    let _ = sb.delete("products", &[("id", "neq.0")]).await;
    let _ = sb.delete("engines", &[("id", "neq.0")]).await;
    let _ = sb.delete("categories", &[("id", "neq.0")]).await;
    let _ = sb.delete("suppliers", &[("id", "neq.0")]).await;
    let _ = sb.delete("manufacturers", &[("id", "neq.0")]).await;

    let mut updated_count: i64 = 0;
    let mut errors: Vec<String> = vec![];

    for (i, line) in lines.iter().enumerate().skip(1) {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let cols = parse_csv_line(line);

        let get_col = |idx: Option<usize>| -> String {
            idx.and_then(|i| cols.get(i).cloned()).unwrap_or_default()
        };

        let part_number = get_col(Some(idx_pn)).to_uppercase();
        let manufacturer_name = get_col(idx_manufacturer);
        let engine_name = get_col(idx_engine);
        let category_name = get_col(idx_category);
        let supplier_name = get_col(Some(idx_sup)).to_uppercase();
        let description = get_col(idx_description);
        let price: f64 = get_col(idx_price).parse().unwrap_or(0.0);
        let quantity: i64 = get_col(idx_quantity).parse().unwrap_or(0);
        let bin = get_col(idx_bin);
        let image = get_col(idx_image);
        let sku = get_col(idx_sku);
        let notes = get_col(idx_notes);
        let ref_nums = get_col(idx_ref_numbers);

        if part_number.is_empty() || supplier_name.is_empty() {
            continue;
        }

        match process_import_row(
            &sb,
            &part_number,
            &manufacturer_name,
            &engine_name,
            &category_name,
            &supplier_name,
            &description,
            price,
            quantity,
            &bin,
            &image,
            &sku,
            &notes,
            &ref_nums,
        )
        .await
        {
            Ok(_) => updated_count += 1,
            Err(e) => errors.push(format!("Line {}: {}", i, e.message)),
        }
    }

    Ok(HttpResponse::Ok().json(json!({
        "message": "Import processed",
        "updatedCount": updated_count,
        "errors": errors
    })))
}

async fn process_import_row(
    sb: &SupabaseClient,
    part_number: &str,
    manufacturer_name: &str,
    engine_name: &str,
    category_name: &str,
    supplier_name: &str,
    description: &str,
    price: f64,
    quantity: i64,
    bin: &str,
    image: &str,
    sku: &str,
    notes: &str,
    ref_nums: &str,
) -> Result<(), AppError> {
    // 1. Manufacturer
    let mut manuf_id: Option<serde_json::Value> = None;
    if !manufacturer_name.is_empty() {
        let existing = sb
            .query_single(
                "manufacturers",
                "id",
                &[("name", &format!("eq.{}", manufacturer_name))],
            )
            .await?;

        if let Some(m) = existing {
            manuf_id = Some(m["id"].clone());
        } else {
            let new_m = sb
                .insert_single("manufacturers", &json!({ "name": manufacturer_name }))
                .await?;
            manuf_id = Some(new_m["id"].clone());
        }
    }

    // 2. Engine
    let mut engine_id: Option<serde_json::Value> = None;
    if !engine_name.is_empty() {
        if let Some(ref mid) = manuf_id {
            let existing = sb
                .query_single(
                    "engines",
                    "id",
                    &[
                        ("name", &format!("eq.{}", engine_name)),
                        ("manufacturer_id", &format!("eq.{}", mid)),
                    ],
                )
                .await?;

            if let Some(e) = existing {
                engine_id = Some(e["id"].clone());
            } else {
                let new_e = sb
                    .insert_single(
                        "engines",
                        &json!({ "name": engine_name, "manufacturer_id": mid }),
                    )
                    .await?;
                engine_id = Some(new_e["id"].clone());
            }
        }
    }

    // 3. Category
    let mut cat_id: Option<serde_json::Value> = None;
    if !category_name.is_empty() {
        let existing = sb
            .query_single(
                "categories",
                "id",
                &[("name", &format!("eq.{}", category_name))],
            )
            .await?;

        if let Some(c) = existing {
            cat_id = Some(c["id"].clone());
        } else {
            let new_c = sb
                .insert_single("categories", &json!({ "name": category_name }))
                .await?;
            cat_id = Some(new_c["id"].clone());
        }
    }

    // 4. Product
    let prod_id: serde_json::Value;
    let existing_product = sb
        .query_single(
            "products",
            "id",
            &[("part_number", &format!("eq.{}", part_number))],
        )
        .await?;

    if let Some(p) = existing_product {
        prod_id = p["id"].clone();
        let mut updates = json!({});
        if !image.is_empty() {
            updates["image_url"] = json!(image);
        }
        if !description.is_empty() {
            updates["description"] = json!(description);
        }
        if !notes.is_empty() {
            updates["notes"] = json!(notes);
        }
        if !ref_nums.is_empty() {
            updates["reference_numbers"] = json!(ref_nums);
        }
        if let Some(ref eid) = engine_id {
            updates["engine_id"] = eid.clone();
        }
        if let Some(ref cid) = cat_id {
            updates["category_id"] = cid.clone();
        }

        if updates.as_object().map_or(false, |o| !o.is_empty()) {
            let _ = sb
                .update("products", &updates, &[("id", &format!("eq.{}", prod_id))])
                .await;
        }
    } else {
        let new_p = sb
            .insert_single(
                "products",
                &json!({
                    "part_number": part_number,
                    "name": description,
                    "description": description,
                    "notes": notes,
                    "engine_id": engine_id,
                    "category_id": cat_id,
                    "image_url": image,
                    "reference_numbers": ref_nums
                }),
            )
            .await?;
        prod_id = new_p["id"].clone();
    }

    // 5. Supplier
    let supp_id: serde_json::Value;
    let existing_supplier = sb
        .query_single(
            "suppliers",
            "id",
            &[("name", &format!("eq.{}", supplier_name))],
        )
        .await?;

    if let Some(s) = existing_supplier {
        supp_id = s["id"].clone();
    } else {
        let new_s = sb
            .insert_single("suppliers", &json!({ "name": supplier_name }))
            .await?;
        supp_id = new_s["id"].clone();
    }

    // 6. Variant
    let existing_variant = sb
        .query_single(
            "product_variants",
            "id",
            &[
                ("product_id", &format!("eq.{}", prod_id)),
                ("supplier_id", &format!("eq.{}", supp_id)),
            ],
        )
        .await?;

    if let Some(v) = existing_variant {
        let _ = sb
            .update(
                "product_variants",
                &json!({
                    "price": price,
                    "stock_quantity": quantity,
                    "bin_location": bin,
                    "sku": sku
                }),
                &[("id", &format!("eq.{}", v["id"]))],
            )
            .await;
    } else {
        let _ = sb
            .insert(
                "product_variants",
                &json!({
                    "product_id": prod_id,
                    "supplier_id": supp_id,
                    "price": price,
                    "stock_quantity": quantity,
                    "bin_location": bin,
                    "sku": sku
                }),
            )
            .await;
    }

    Ok(())
}

fn parse_csv_line(text: &str) -> Vec<String> {
    let mut result = vec![];
    let mut current = String::new();
    let mut in_quote = false;
    let chars: Vec<char> = text.chars().collect();

    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c == '"' {
            if in_quote && i + 1 < chars.len() && chars[i + 1] == '"' {
                current.push('"');
                i += 1;
            } else {
                in_quote = !in_quote;
            }
        } else if c == ',' && !in_quote {
            result.push(current.trim().to_string());
            current = String::new();
        } else {
            current.push(c);
        }
        i += 1;
    }
    result.push(current.trim().to_string());
    result
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/inventory/export")
            .route(web::get().to(export_inventory)),
    )
    .service(
        web::resource("/api/inventory/import")
            .route(web::post().to(import_inventory)),
    );
}

use actix_web::{web, HttpResponse};
use serde_json::json;

use crate::error::AppError;
use crate::models::ProductQuery;
use crate::models::ProductUpdate;
use crate::routes::admin::ResponseCache;
use crate::supabase::SupabaseClient;

/// GET /api/products?search=&engineId=&categoryId=
pub async fn get_products(
    query: web::Query<ProductQuery>,
    sb: web::Data<SupabaseClient>,
    cache: web::Data<ResponseCache>,
) -> Result<HttpResponse, AppError> {
    let search = query.search.as_deref().unwrap_or("");
    let engine_id = query.engine_id.as_deref().unwrap_or("");
    let category_id = query.category_id.as_deref().unwrap_or("");

    // Build cache key from query params
    let cache_key = format!("products:{}:{}:{}", search, engine_id, category_id);

    // Check cache first
    if let Some(cached) = cache.get(&cache_key) {
        log::info!("products: cache HIT ({})", cache_key);
        return Ok(HttpResponse::Ok().json(cached));
    }

    log::info!("products: cache MISS ({}) — fetching from Supabase", cache_key);

    // If engineId is provided, use inner join query
    if !engine_id.is_empty() {
        let select = "*,product_engines!inner(engine_id),category:categories(id,name)";
        let mut params: Vec<(&str, String)> = vec![
            ("product_engines.engine_id", format!("eq.{}", engine_id)),
        ];
        if !category_id.is_empty() {
            params.push(("category_id", format!("eq.{}", category_id)));
        }

        let param_refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
        let data = sb.query("products", select, &param_refs).await?;

        let formatted = format_products(&data);
        cache.set(cache_key, formatted.clone());
        return Ok(HttpResponse::Ok().json(formatted));
    }

    // Normal query with optional search
    let select = "*,product_engines!left(engine:engines(id,name,manufacturer:manufacturers(id,name))),category:categories(id,name)";
    let mut params: Vec<(&str, String)> = vec![];

    if !search.is_empty() {
        // Search SKUs in variants first
        let sku_variants = sb
            .query(
                "product_variants",
                "product_id",
                &[("sku", &format!("ilike.%{}%", search))],
            )
            .await?;

        let mut or_clause = format!(
            "part_number.ilike.%{}%,name.ilike.%{}%,description.ilike.%{}%",
            search, search, search
        );

        if let Some(arr) = sku_variants.as_array() {
            let ids: Vec<String> = arr
                .iter()
                .filter_map(|v| {
                    v["product_id"].as_i64().map(|id| id.to_string())
                        .or_else(|| v["product_id"].as_str().map(|s| s.to_string()))
                })
                .collect();
            if !ids.is_empty() {
                let unique: Vec<String> = ids.into_iter().collect::<std::collections::HashSet<_>>().into_iter().collect();
                or_clause.push_str(&format!(",id.in.({})", unique.join(",")));
            }
        }

        params.push(("or", format!("({})", or_clause)));
    }

    if !category_id.is_empty() {
        params.push(("category_id", format!("eq.{}", category_id)));
    }

    let param_refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    let data = sb.query("products", select, &param_refs).await?;

    let formatted = format_products(&data);
    cache.set(cache_key, formatted.clone());
    Ok(HttpResponse::Ok().json(formatted))
}

fn format_products(data: &serde_json::Value) -> serde_json::Value {
    if let Some(arr) = data.as_array() {
        let formatted: Vec<serde_json::Value> = arr
            .iter()
            .map(|p| {
                let engines: Vec<serde_json::Value> = p["product_engines"]
                    .as_array()
                    .map(|pes| {
                        pes.iter()
                            .filter_map(|pe| {
                                let engine = &pe["engine"];
                                if engine.is_null() { None } else { Some(engine.clone()) }
                            })
                            .collect()
                    })
                    .unwrap_or_default();

                let first_engine = engines.first().cloned().unwrap_or(serde_json::Value::Null);

                let mut product = p.clone();
                if let Some(obj) = product.as_object_mut() {
                    obj.insert("engines".to_string(), json!(engines));
                    obj.insert("engine".to_string(), first_engine);
                }
                product
            })
            .collect();
        json!(formatted)
    } else {
        data.clone()
    }
}

/// GET /api/products/{id}/variants
pub async fn get_variants(
    path: web::Path<String>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let product_id = path.into_inner();

    let data = sb
        .query(
            "product_variants",
            "*,supplier:suppliers(name)",
            &[("product_id", &format!("eq.{}", product_id))],
        )
        .await?;

    // Flatten supplier name
    let empty = vec![];
    let variants: Vec<serde_json::Value> = data
        .as_array()
        .unwrap_or(&empty)
        .iter()
        .map(|v| {
            let supplier_name = v["supplier"]["name"]
                .as_str()
                .unwrap_or("Unknown")
                .to_string();
            let mut variant = v.clone();
            if let Some(obj) = variant.as_object_mut() {
                obj.insert("supplierName".to_string(), json!(supplier_name));
            }
            variant
        })
        .collect();

    Ok(HttpResponse::Ok().json(variants))
}

/// PUT /api/products/{id}
pub async fn update_product(
    path: web::Path<String>,
    body: web::Json<ProductUpdate>,
    sb: web::Data<SupabaseClient>,
    cache: web::Data<ResponseCache>,
) -> Result<HttpResponse, AppError> {
    let product_id = path.into_inner();

    // 1. Update product details
    let mut update_payload = json!({});
    if let Some(ref pn) = body.part_number {
        update_payload["part_number"] = json!(pn);
    }
    if let Some(ref name) = body.name {
        update_payload["name"] = json!(name);
    }
    if let Some(ref desc) = body.description {
        update_payload["description"] = json!(desc);
    }
    if let Some(ref notes) = body.notes {
        update_payload["notes"] = json!(notes);
    }
    if let Some(ref img) = body.image_url {
        update_payload["image_url"] = json!(img);
    }
    if let Some(ref refs) = body.reference_numbers {
        update_payload["reference_numbers"] = json!(refs);
    }

    sb.update(
        "products",
        &update_payload,
        &[("id", &format!("eq.{}", product_id))],
    )
    .await?;

    // 2. Update engine links if provided
    if let Some(ref engine_ids) = body.engine_ids {
        // Delete existing links
        sb.delete(
            "product_engines",
            &[("product_id", &format!("eq.{}", product_id))],
        )
        .await?;

        // Insert new links
        if !engine_ids.is_empty() {
            let links: Vec<serde_json::Value> = engine_ids
                .iter()
                .map(|eid| {
                    json!({
                        "product_id": product_id.parse::<i64>().unwrap_or(0),
                        "engine_id": eid
                    })
                })
                .collect();
            sb.insert("product_engines", &json!(links)).await?;
        }
    }

    // Invalidate products cache on mutation
    cache.invalidate_prefix("products:");

    Ok(HttpResponse::Ok().json(json!({ "success": true })))
}

/// DELETE /api/products/{id}
pub async fn delete_product(
    path: web::Path<String>,
    sb: web::Data<SupabaseClient>,
    cache: web::Data<ResponseCache>,
) -> Result<HttpResponse, AppError> {
    let product_id = path.into_inner();
    sb.delete("products", &[("id", &format!("eq.{}", product_id))])
        .await?;

    // Invalidate products cache on mutation
    cache.invalidate_prefix("products:");

    Ok(HttpResponse::Ok().json(json!({ "success": true })))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/products")
            .route(web::get().to(get_products)),
    )
    .service(
        web::resource("/api/products/{id}/variants")
            .route(web::get().to(get_variants)),
    )
    .service(
        web::resource("/api/products/{id}")
            .route(web::put().to(update_product))
            .route(web::delete().to(delete_product)),
    );
}

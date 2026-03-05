use actix_web::{web, HttpRequest, HttpResponse};
use serde_json::json;

use crate::error::AppError;
use crate::models::SaleCreate;
use crate::supabase::SupabaseClient;
use crate::middleware::AuthUser;

/// GET /api/sales
pub async fn get_sales(
    _auth: AuthUser,
    req: HttpRequest,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let mut params: Vec<(&str, String)> = vec![
        ("order", "created_at.desc".to_string()),
        ("limit", "50".to_string()),
    ];

    // Customer context via header
    if let Some(customer_id) = req.headers().get("x-customer-id") {
        if let Ok(cid) = customer_id.to_str() {
            params.push(("customer_id", format!("eq.{}", cid)));
        }
    }

    let select = "*,items:sale_items(*)";
    let param_refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    let data = sb.query("sales", select, &param_refs).await?;

    Ok(HttpResponse::Ok().json(data))
}

/// POST /api/sales
pub async fn create_sale(
    _auth: AuthUser,
    body: web::Json<SaleCreate>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    if body.items.is_empty() {
        return Err(AppError::bad_request("No items"));
    }

    let total_amount: f64 = body
        .items
        .iter()
        .map(|item| item.quantity as f64 * item.unit_price)
        .sum();

    let from_cart = body.from_cart.unwrap_or(false);
    let payment_method = body.payment_method.as_deref().unwrap_or("Cash");
    let amount_paid = body.amount_paid.unwrap_or(total_amount);
    let change = body.change.unwrap_or(0.0);

    // 1. Create Sale
    let sale = sb
        .insert_single(
            "sales",
            &json!({
                "total_amount": total_amount,
                "customer_id": body.customer_id,
                "payment_method": payment_method,
                "amount_paid": amount_paid,
                "change": change,
                "transaction_id": body.transaction_id,
                "created_at": chrono::Utc::now().to_rfc3339()
            }),
        )
        .await?;

    let sale_id = &sale["id"];

    // 2. Create Sale Items
    for item in &body.items {
        let product_name = item
            .product_name
            .as_deref()
            .or(item.product_name_alt.as_deref())
            .unwrap_or("");
        let supplier_name = item
            .supplier_name
            .as_deref()
            .or(item.supplier_name_alt.as_deref())
            .unwrap_or("");

        let _ = sb
            .insert(
                "sale_items",
                &json!({
                    "sale_id": sale_id,
                    "variant_id": item.variant_id,
                    "product_name": product_name,
                    "supplier_name": supplier_name,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "subtotal": item.quantity as f64 * item.unit_price
                }),
            )
            .await;

        // 3. Update stock (only if NOT from cart)
        if !from_cart {
            let variant = sb
                .query_single(
                    "product_variants",
                    "stock_quantity",
                    &[("id", &format!("eq.{}", item.variant_id))],
                )
                .await?;

            if let Some(v) = variant {
                let current_stock = v["stock_quantity"].as_i64().unwrap_or(0);
                let new_stock = current_stock - item.quantity;
                let _ = sb
                    .update(
                        "product_variants",
                        &json!({ "stock_quantity": new_stock }),
                        &[("id", &format!("eq.{}", item.variant_id))],
                    )
                    .await;
            }
        }
    }

    // 4. If fromCart, clear cart without restoring stock
    if from_cart {
        if let Some(ref customer_id) = body.customer_id {
            let _ = sb
                .rpc("checkout_cart_clear", &json!({ "p_user_id": customer_id }))
                .await;
        }
    }

    Ok(HttpResponse::Ok().json(json!({ "success": true, "saleId": sale_id })))
}

/// GET /api/sales/{id}
pub async fn get_sale(
    path: web::Path<String>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let sale_id = path.into_inner();

    let sale = sb
        .query_single("sales", "*", &[("id", &format!("eq.{}", sale_id))])
        .await?;

    let sale = match sale {
        Some(s) => s,
        None => return Err(AppError::internal("Sale not found")),
    };

    let items = sb
        .query("sale_items", "*", &[("sale_id", &format!("eq.{}", sale_id))])
        .await?;

    let mut result = sale;
    if let Some(obj) = result.as_object_mut() {
        obj.insert("items".to_string(), items);
    }

    Ok(HttpResponse::Ok().json(result))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/sales")
            .route(web::get().to(get_sales))
            .route(web::post().to(create_sale)),
    )
    .service(
        web::resource("/api/sales/{id}")
            .route(web::get().to(get_sale)),
    );
}

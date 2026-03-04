use actix_web::{web, HttpResponse};
use serde_json::json;

use crate::error::AppError;
use crate::models::{CartQuery, CartAdd, CartRemove, CartClear};
use crate::supabase::SupabaseClient;

/// GET /api/cart?userId=...
pub async fn get_cart(
    query: web::Query<CartQuery>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let user_id = query.user_id.as_deref().unwrap_or("");
    if user_id.is_empty() {
        return Err(AppError::bad_request("userId required"));
    }

    let select = "id,quantity,variant_id,product_variants(id,price,sku,stock_quantity,products(id,name,image_url,description),suppliers(name))";
    let data = sb
        .query("cart_items", select, &[("user_id", &format!("eq.{}", user_id))])
        .await?;

    // Flatten for frontend
    let cart: Vec<serde_json::Value> = data
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|item| {
            let pv = &item["product_variants"];
            let product = &pv["products"];
            let supplier_name = pv["suppliers"]["name"]
                .as_str()
                .unwrap_or("Unknown");

            json!({
                "id": product["id"],
                "variantId": item["variant_id"],
                "productName": product["name"],
                "variantName": pv["sku"].as_str().unwrap_or(
                    product["name"].as_str().unwrap_or("")
                ),
                "supplierName": supplier_name,
                "price": pv["price"],
                "quantity": item["quantity"],
                "image_url": product["image_url"],
                "stock_quantity": pv["stock_quantity"]
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(cart))
}

/// POST /api/cart/add
pub async fn add_to_cart(
    body: web::Json<CartAdd>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let result = sb
        .rpc(
            "add_to_cart",
            &json!({
                "p_user_id": body.user_id,
                "p_variant_id": body.variant_id,
                "p_quantity": body.quantity.unwrap_or(1)
            }),
        )
        .await;

    match result {
        Ok(_) => Ok(HttpResponse::Ok().json(json!({ "success": true }))),
        Err(e) => Err(AppError::bad_request(e.message)),
    }
}

/// POST /api/cart/remove
pub async fn remove_from_cart(
    body: web::Json<CartRemove>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    sb.rpc(
        "remove_from_cart",
        &json!({
            "p_user_id": body.user_id,
            "p_variant_id": body.variant_id,
            "p_quantity": body.quantity
        }),
    )
    .await?;

    Ok(HttpResponse::Ok().json(json!({ "success": true })))
}

/// POST /api/cart/clear
pub async fn clear_cart(
    body: web::Json<CartClear>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    sb.rpc(
        "clear_cart_release_stock",
        &json!({ "p_user_id": body.user_id }),
    )
    .await?;

    Ok(HttpResponse::Ok().json(json!({ "success": true })))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(web::resource("/api/cart").route(web::get().to(get_cart)))
        .service(web::resource("/api/cart/add").route(web::post().to(add_to_cart)))
        .service(web::resource("/api/cart/remove").route(web::post().to(remove_from_cart)))
        .service(web::resource("/api/cart/clear").route(web::post().to(clear_cart)));
}

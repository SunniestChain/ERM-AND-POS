use actix_web::{web, HttpResponse};
use serde_json::json;

use crate::error::AppError;
use crate::models::{VariantCreate, VariantUpdate};
use crate::supabase::SupabaseClient;

/// POST /api/variants
pub async fn create_variant(
    body: web::Json<VariantCreate>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let data = sb
        .insert_single(
            "product_variants",
            &json!({
                "product_id": body.product_id,
                "supplier_id": body.supplier_id,
                "price": body.price.unwrap_or(0.0),
                "sku": body.sku.as_deref().unwrap_or(""),
                "stock_quantity": body.stock_quantity.unwrap_or(0),
                "bin_location": body.bin_location.as_deref().unwrap_or("")
            }),
        )
        .await?;

    Ok(HttpResponse::Ok().json(data))
}

/// PUT /api/variants/{id}
pub async fn update_variant(
    path: web::Path<String>,
    body: web::Json<VariantUpdate>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let variant_id = path.into_inner();

    let mut payload = json!({});
    if let Some(price) = body.price {
        payload["price"] = json!(price);
    }
    if let Some(ref sku) = body.sku {
        payload["sku"] = json!(sku);
    }
    if let Some(qty) = body.stock_quantity {
        payload["stock_quantity"] = json!(qty);
    }
    if let Some(ref bin) = body.bin_location {
        payload["bin_location"] = json!(bin);
    }

    sb.update(
        "product_variants",
        &payload,
        &[("id", &format!("eq.{}", variant_id))],
    )
    .await?;

    Ok(HttpResponse::Ok().json(json!({ "success": true })))
}

/// DELETE /api/variants/{id}
pub async fn delete_variant(
    path: web::Path<String>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let variant_id = path.into_inner();
    sb.delete(
        "product_variants",
        &[("id", &format!("eq.{}", variant_id))],
    )
    .await?;
    Ok(HttpResponse::Ok().json(json!({ "success": true })))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/variants")
            .route(web::post().to(create_variant)),
    )
    .service(
        web::resource("/api/variants/{id}")
            .route(web::put().to(update_variant))
            .route(web::delete().to(delete_variant)),
    );
}

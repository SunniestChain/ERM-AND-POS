use actix_web::{web, HttpResponse};
use serde_json::json;

use crate::error::AppError;
use crate::models::SettingsCreate;
use crate::routes::admin::ResponseCache;
use crate::supabase::SupabaseClient;

const ALLOWED_TABLES: &[&str] = &["manufacturers", "engines", "categories", "suppliers"];

/// POST /api/{table}
pub async fn create_entity(
    path: web::Path<String>,
    body: web::Json<SettingsCreate>,
    sb: web::Data<SupabaseClient>,
    cache: web::Data<ResponseCache>,
) -> Result<HttpResponse, AppError> {
    let table = path.into_inner();
    if !ALLOWED_TABLES.contains(&table.as_str()) {
        return Err(AppError::bad_request(format!("Invalid table: {}", table)));
    }

    let mut payload = json!({ "name": body.name });
    if table == "engines" {
        if let Some(ref mid) = body.manufacturer_id {
            payload["manufacturer_id"] = mid.clone();
        }
    }

    let data = sb.insert_single(&table, &payload).await?;

    // Invalidate hierarchy cache when settings change
    cache.invalidate("hierarchy");

    Ok(HttpResponse::Ok().json(data))
}

/// DELETE /api/{table}/{id}
pub async fn delete_entity(
    path: web::Path<(String, String)>,
    sb: web::Data<SupabaseClient>,
    cache: web::Data<ResponseCache>,
) -> Result<HttpResponse, AppError> {
    let (table, id) = path.into_inner();
    if !ALLOWED_TABLES.contains(&table.as_str()) {
        return Err(AppError::bad_request(format!("Invalid table: {}", table)));
    }

    sb.delete(&table, &[("id", &format!("eq.{}", id))]).await?;

    // Invalidate hierarchy cache when settings change
    cache.invalidate("hierarchy");

    Ok(HttpResponse::Ok().json(json!({ "success": true })))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/{table}")
            .route(web::post().to(create_entity))
            // Guard: only match allowed tables to avoid conflicting with other routes
            .guard(actix_web::guard::fn_guard(|ctx| {
                let table = ctx.head().uri.path().trim_start_matches("/api/");
                // Only match if it's one of the settings tables (no '/' in remainder)
                !table.contains('/') && ALLOWED_TABLES.contains(&table)
            })),
    )
    .service(
        web::resource("/api/{table}/{id}")
            .route(web::delete().to(delete_entity))
            .guard(actix_web::guard::fn_guard(|ctx| {
                let path = ctx.head().uri.path().trim_start_matches("/api/");
                if let Some(table) = path.split('/').next() {
                    ALLOWED_TABLES.contains(&table)
                } else {
                    false
                }
            })),
    );
}

use actix_web::{web, HttpResponse};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::error::AppError;
use crate::supabase::SupabaseClient;
use crate::middleware::AuthUser;

/// Simple TTL cache for JSON responses
pub struct ResponseCache {
    entries: Mutex<HashMap<String, (Instant, serde_json::Value)>>,
    ttl: Duration,
}

impl ResponseCache {
    pub fn new(ttl_seconds: u64) -> Self {
        ResponseCache {
            entries: Mutex::new(HashMap::new()),
            ttl: Duration::from_secs(ttl_seconds),
        }
    }

    pub fn get(&self, key: &str) -> Option<serde_json::Value> {
        let entries = self.entries.lock().unwrap();
        if let Some((stored_at, value)) = entries.get(key) {
            if stored_at.elapsed() < self.ttl {
                return Some(value.clone());
            }
        }
        None
    }

    pub fn set(&self, key: String, value: serde_json::Value) {
        let mut entries = self.entries.lock().unwrap();
        entries.insert(key, (Instant::now(), value));
    }

    pub fn invalidate(&self, key: &str) {
        let mut entries = self.entries.lock().unwrap();
        entries.remove(key);
    }

    #[allow(dead_code)]
    pub fn invalidate_all(&self) {
        let mut entries = self.entries.lock().unwrap();
        entries.clear();
    }

    pub fn invalidate_prefix(&self, prefix: &str) {
        let mut entries = self.entries.lock().unwrap();
        entries.retain(|k, _| !k.starts_with(prefix));
    }
}

/// GET /api/admin/stats
pub async fn get_stats(
    auth: AuthUser,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    if auth.role != "admin" {
        return Err(AppError::unauthorized("Admin access required"));
    }
    let data = sb
        .query_single("admin_stats", "*", &[])
        .await?;

    match data {
        Some(d) => Ok(HttpResponse::Ok().json(json!({
            "totalStock": d["total_stock"],
            "totalValue": d["total_value"],
            "salesToday": d["sales_today"],
            "salesWeek": d["sales_week"],
            "salesMonth": d["sales_month"],
            "salesYear": d["sales_year"]
        }))),
        None => Ok(HttpResponse::Ok().json(json!({
            "totalStock": 0,
            "totalValue": 0,
            "salesToday": 0,
            "salesWeek": 0,
            "salesMonth": 0,
            "salesYear": 0
        }))),
    }
}

/// GET /api/admin/active-carts
pub async fn get_active_carts(
    auth: AuthUser,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    if auth.role != "admin" {
        return Err(AppError::unauthorized("Admin access required"));
    }
    let select = "user_id,quantity,updated_at,app_users(username,email),product_variants(sku,products(name))";
    let data = sb.query("cart_items", select, &[]).await?;

    // Group by user
    let mut carts_by_user: HashMap<String, serde_json::Value> = HashMap::new();

    if let Some(arr) = data.as_array() {
        for item in arr {
            let uid = item["user_id"].to_string();
            let qty = item["quantity"].as_i64().unwrap_or(0);

            let entry = carts_by_user.entry(uid.clone()).or_insert_with(|| {
                json!({
                    "user": item["app_users"],
                    "items": [],
                    "totalItems": 0,
                    "lastActive": item["updated_at"]
                })
            });

            if let Some(items_arr) = entry["items"].as_array_mut() {
                items_arr.push(json!({
                    "product": item["product_variants"]["products"]["name"],
                    "sku": item["product_variants"]["sku"],
                    "qty": qty
                }));
            }

            let current_total = entry["totalItems"].as_i64().unwrap_or(0);
            entry["totalItems"] = json!(current_total + qty);

            // Update lastActive if newer
            let item_time = item["updated_at"].as_str().unwrap_or("");
            let current_time = entry["lastActive"].as_str().unwrap_or("");
            if item_time > current_time {
                entry["lastActive"] = item["updated_at"].clone();
            }
        }
    }

    let result: Vec<serde_json::Value> = carts_by_user.into_values().collect();
    Ok(HttpResponse::Ok().json(result))
}

/// GET /api/hierarchy — OPTIMIZED: parallel queries + 30s cache
pub async fn get_hierarchy(
    sb: web::Data<SupabaseClient>,
    cache: web::Data<ResponseCache>,
) -> Result<HttpResponse, AppError> {
    // Check cache first
    if let Some(cached) = cache.get("hierarchy") {
        log::info!("hierarchy: cache HIT");
        return Ok(HttpResponse::Ok().json(cached));
    }

    log::info!("hierarchy: cache MISS — fetching in parallel");

    // Fire all 4 queries in PARALLEL instead of sequential
    let (manufacturers, engines, categories, suppliers) = tokio::join!(
        sb.query("manufacturers", "*", &[]),
        sb.query("engines", "*", &[]),
        sb.query("categories", "*", &[]),
        sb.query("suppliers", "*", &[])
    );

    let result = json!({
        "manufacturers": manufacturers?,
        "engines": engines?,
        "categories": categories?,
        "suppliers": suppliers?
    });

    // Cache for 30 seconds
    cache.set("hierarchy".to_string(), result.clone());

    Ok(HttpResponse::Ok().json(result))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(web::resource("/api/admin/stats").route(web::get().to(get_stats)))
        .service(web::resource("/api/admin/active-carts").route(web::get().to(get_active_carts)))
        .service(web::resource("/api/hierarchy").route(web::get().to(get_hierarchy)));
}

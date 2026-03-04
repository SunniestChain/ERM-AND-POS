use serde_json::json;

use crate::supabase::SupabaseClient;

pub async fn init_system(sb: &SupabaseClient) {
    log::info!("Initializing System...");

    // 1. Create default users if they don't exist
    match sb
        .query_single("app_users", "id", &[("username", "eq.admin")])
        .await
    {
        Ok(Some(_)) => {
            log::info!("Default admin user already exists.");
        }
        Ok(None) => {
            log::info!("Creating default users...");
            let _ = sb
                .insert(
                    "app_users",
                    &json!([
                        { "username": "admin", "password": "admin", "role": "admin" },
                        { "username": "pos", "password": "pos", "role": "employee" }
                    ]),
                )
                .await;
        }
        Err(e) => {
            log::error!("Error checking for admin user: {}", e);
        }
    }

    // 2. Migration: Products.engine_id -> product_engines
    match sb.count("product_engines", &[]).await {
        Ok(count) => {
            if count == 0 {
                log::info!("Checking for legacy engine data to migrate...");
                match sb
                    .query(
                        "products",
                        "id,engine_id",
                        &[("engine_id", "not.is.null")],
                    )
                    .await
                {
                    Ok(legacy) => {
                        if let Some(arr) = legacy.as_array() {
                            if !arr.is_empty() {
                                log::info!(
                                    "Migrating {} products to product_engines...",
                                    arr.len()
                                );
                                let links: Vec<serde_json::Value> = arr
                                    .iter()
                                    .map(|p| {
                                        json!({
                                            "product_id": p["id"],
                                            "engine_id": p["engine_id"]
                                        })
                                    })
                                    .collect();

                                match sb
                                    .insert("product_engines", &json!(links))
                                    .await
                                {
                                    Ok(_) => log::info!("Migration successful!"),
                                    Err(e) => log::error!("Migration failed: {}", e),
                                }
                            } else {
                                log::info!("No legacy data found.");
                            }
                        }
                    }
                    Err(e) => log::error!("Error fetching legacy products: {}", e),
                }
            } else {
                log::info!("product_engines already populated ({} rows).", count);
            }
        }
        Err(e) => log::error!("Error counting product_engines: {}", e),
    }

    log::info!("System initialization complete.");
}

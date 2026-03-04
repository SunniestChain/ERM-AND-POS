mod error;
mod init;
mod models;
mod routes;
mod supabase;

use actix_cors::Cors;
use actix_web::{middleware, web, App, HttpServer};

use routes::admin::ResponseCache;
use supabase::SupabaseClient;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load .env from project root (one level up from api-rust/) for local dev
    let env_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join(".env");
    dotenvy::from_path(&env_path).ok();
    // Also try current directory (for Docker)
    dotenvy::dotenv().ok();

    // Initialize logger
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    log::info!("Starting ERM API server (Rust)...");

    // Initialize Supabase client
    let sb = SupabaseClient::new();

    // Run system initialization
    init::init_system(&sb).await;

    let sb_data = web::Data::new(sb);

    // Response cache: 30s TTL for hierarchy/products (rarely change)
    let cache = web::Data::new(ResponseCache::new(30));

    // Use PORT env var (set by Render/Railway) or default to 3000
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse()
        .unwrap_or(3000);

    log::info!("Server running on http://localhost:{}", port);
    log::info!("Connected to Supabase");
    log::info!("Response cache enabled (30s TTL)");
    log::info!("Gzip/Brotli compression enabled");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(middleware::Compress::default())
            .wrap(middleware::Logger::new("[%t] %r %s %D ms"))
            .app_data(sb_data.clone())
            .app_data(cache.clone())
            // Increase payload limit for CSV imports
            .app_data(web::PayloadConfig::new(10 * 1024 * 1024)) // 10MB
            .app_data(
                web::JsonConfig::default()
                    .limit(10 * 1024 * 1024)
                    .error_handler(|err, _req| {
                        let msg = err.to_string();
                        actix_web::error::InternalError::from_response(
                            err,
                            actix_web::HttpResponse::BadRequest()
                                .json(serde_json::json!({ "error": msg })),
                        )
                        .into()
                    }),
            )
            // Register all route modules
            .configure(routes::auth::config)
            .configure(routes::products::config)
            .configure(routes::variants::config)
            .configure(routes::sales::config)
            .configure(routes::cart::config)
            .configure(routes::admin::config)
            .configure(routes::stripe::config)
            .configure(routes::inventory::config)
            // Settings routes last (they use dynamic {table} patterns)
            .configure(routes::settings::config)
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}

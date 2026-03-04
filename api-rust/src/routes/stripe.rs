use actix_web::{web, HttpResponse, HttpRequest};
use serde_json::json;

use crate::error::AppError;
use crate::models::PaymentRequest;

/// POST /api/create-payment-intent
pub async fn create_payment_intent(
    body: web::Json<PaymentRequest>,
) -> Result<HttpResponse, AppError> {
    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::internal("STRIPE_SECRET_KEY not set"))?;

    // Parse amount (can be string or number from JSON)
    let amount: f64 = match &body.amount {
        serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0),
        serde_json::Value::String(s) => s.parse().unwrap_or(0.0),
        _ => 0.0,
    };
    let amount_in_cents = (amount * 100.0).round() as i64;

    // Use Stripe REST API directly via reqwest
    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.stripe.com/v1/payment_intents")
        .basic_auth(&stripe_key, None::<&str>)
        .form(&[
            ("amount", amount_in_cents.to_string()),
            ("currency", "mxn".to_string()),
            ("automatic_payment_methods[enabled]", "true".to_string()),
        ])
        .send()
        .await
        .map_err(|e| AppError::internal(e.to_string()))?;

    let status = resp.status();
    let body: serde_json::Value = resp.json().await
        .map_err(|e| AppError::internal(e.to_string()))?;

    if !status.is_success() {
        let msg = body["error"]["message"]
            .as_str()
            .unwrap_or("Stripe API error");
        return Err(AppError::internal(msg));
    }

    Ok(HttpResponse::Ok().json(json!({
        "clientSecret": body["client_secret"]
    })))
}

/// POST /api/create-checkout-session
pub async fn create_checkout_session(
    req: HttpRequest,
    body: web::Json<PaymentRequest>,
) -> Result<HttpResponse, AppError> {
    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::internal("STRIPE_SECRET_KEY not set"))?;

    let amount: f64 = match &body.amount {
        serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0),
        serde_json::Value::String(s) => s.parse().unwrap_or(0.0),
        _ => 0.0,
    };
    let amount_in_cents = (amount * 100.0).round() as i64;

    // Get origin from request headers
    let origin = req
        .headers()
        .get("origin")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("http://localhost:5173");

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.stripe.com/v1/checkout/sessions")
        .basic_auth(&stripe_key, None::<&str>)
        .form(&[
            ("line_items[0][price_data][currency]", "mxn"),
            ("line_items[0][price_data][product_data][name]", "POS Sale Total"),
            ("line_items[0][price_data][unit_amount]", &amount_in_cents.to_string()),
            ("line_items[0][quantity]", "1"),
            ("mode", "payment"),
            ("success_url", &format!("{}/?success=true&session_id={{CHECKOUT_SESSION_ID}}", origin)),
            ("cancel_url", &format!("{}/?canceled=true", origin)),
        ])
        .send()
        .await
        .map_err(|e| AppError::internal(e.to_string()))?;

    let status = resp.status();
    let body: serde_json::Value = resp.json().await
        .map_err(|e| AppError::internal(e.to_string()))?;

    if !status.is_success() {
        let msg = body["error"]["message"]
            .as_str()
            .unwrap_or("Stripe API error");
        return Err(AppError::internal(msg));
    }

    Ok(HttpResponse::Ok().json(json!({
        "url": body["url"]
    })))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/create-payment-intent")
            .route(web::post().to(create_payment_intent)),
    )
    .service(
        web::resource("/api/create-checkout-session")
            .route(web::post().to(create_checkout_session)),
    );
}

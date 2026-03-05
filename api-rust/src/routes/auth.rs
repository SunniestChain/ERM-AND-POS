use actix_web::{web, HttpResponse};
use serde_json::json;

use crate::error::AppError;
use crate::models::{LoginRequest, RegisterRequest};
use crate::supabase::SupabaseClient;
use crate::middleware::create_jwt;

/// POST /api/login
pub async fn login(
    body: web::Json<LoginRequest>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    log::info!("Login attempt for: {}", body.username);

    let user = sb
        .query_single(
            "app_users",
            "*",
            &[("username", &format!("eq.{}", body.username))],
        )
        .await?;

    let user = match user {
        Some(u) => u,
        None => return Err(AppError::unauthorized("User not found")),
    };

    // Bcrypt password verification
    let stored_hash = user["password"].as_str().unwrap_or("");
    let password_valid = bcrypt::verify(&body.password, stored_hash).unwrap_or(false);

    if !password_valid {
        // Fallback: support legacy plaintext passwords during migration
        if stored_hash != body.password {
            return Err(AppError::unauthorized("Invalid credentials"));
        }
        // If plaintext match, auto-upgrade to bcrypt hash
        if let Ok(hashed) = bcrypt::hash(&body.password, 12) {
            let user_id_str = user["id"].as_str().unwrap_or("");
            if !user_id_str.is_empty() {
                let _ = sb.update(
                    "app_users",
                    &json!({ "password": hashed }),
                    &[("id", &format!("eq.{}", user_id_str))],
                ).await;
                log::info!("Auto-upgraded password hash for user: {}", body.username);
            }
        }
    }

    // Check if user is verified (for OTP flow)
    let is_verified = user["is_verified"].as_bool().unwrap_or(true);
    if !is_verified {
        return Err(AppError::unauthorized("Account not verified. Please check your email for the verification code."));
    }

    // Generate JWT token
    let user_id = user["id"].to_string().trim_matches('"').to_string();
    let role = user["role"].as_str().unwrap_or("customer").to_string();
    let token = create_jwt(&user_id, &role)?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "email": user["email"]
        }
    })))
}

/// POST /api/register
pub async fn register(
    body: web::Json<RegisterRequest>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    if body.username.is_empty() || body.password.is_empty() || body.email.is_empty() {
        return Err(AppError::bad_request("All fields required"));
    }

    if body.password.len() < 6 {
        return Err(AppError::bad_request("Password must be at least 6 characters"));
    }

    // Check if user exists
    let existing = sb
        .query_single(
            "app_users",
            "id",
            &[("or", &format!("(username.eq.{},email.eq.{})", body.username, body.email))],
        )
        .await?;

    if existing.is_some() {
        return Err(AppError::bad_request("Username or Email already exists"));
    }

    // Hash password with bcrypt
    let hashed_password = bcrypt::hash(&body.password, 12)
        .map_err(|e| AppError::internal(format!("Failed to hash password: {}", e)))?;

    // Generate 6-digit OTP
    use rand::Rng;
    let otp_code: String = format!("{:06}", rand::thread_rng().gen_range(100000..999999));
    let otp_expires = chrono::Utc::now() + chrono::Duration::minutes(15);

    let _new_user = sb
        .insert_single(
            "app_users",
            &json!({
                "username": body.username,
                "password": hashed_password,
                "email": body.email,
                "role": "customer",
                "is_verified": false,
                "otp_code": otp_code,
                "otp_expires_at": otp_expires.to_rfc3339()
            }),
        )
        .await?;

    // Send OTP email
    let email_sent = send_otp_email(&body.email, &otp_code, &body.username).await;
    if let Err(e) = &email_sent {
        log::warn!("Failed to send OTP email to {}: {}", body.email, e);
    }

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "needsVerification": true,
        "email": body.email,
        "message": "Account created! Check your email for a verification code."
    })))
}

/// POST /api/verify-otp
pub async fn verify_otp(
    body: web::Json<serde_json::Value>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let email = body["email"].as_str().ok_or_else(|| AppError::bad_request("Email required"))?;
    let code = body["code"].as_str().ok_or_else(|| AppError::bad_request("Code required"))?;

    let user = sb
        .query_single("app_users", "*", &[("email", &format!("eq.{}", email))])
        .await?;

    let user = match user {
        Some(u) => u,
        None => return Err(AppError::bad_request("User not found")),
    };

    // Check if already verified
    if user["is_verified"].as_bool().unwrap_or(false) {
        return Ok(HttpResponse::Ok().json(json!({
            "success": true,
            "message": "Account already verified"
        })));
    }

    // Validate OTP code
    let stored_otp = user["otp_code"].as_str().unwrap_or("");
    if stored_otp != code {
        return Err(AppError::bad_request("Invalid verification code"));
    }

    // Check expiry
    if let Some(expires_str) = user["otp_expires_at"].as_str() {
        if let Ok(expires) = chrono::DateTime::parse_from_rfc3339(expires_str) {
            if chrono::Utc::now() > expires {
                return Err(AppError::bad_request("Verification code expired. Please request a new one."));
            }
        }
    }

    // Mark as verified
    let user_id = user["id"].as_str().unwrap_or("");
    sb.update(
        "app_users",
        &json!({
            "is_verified": true,
            "otp_code": serde_json::Value::Null,
            "otp_expires_at": serde_json::Value::Null
        }),
        &[("id", &format!("eq.{}", user_id))],
    )
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "message": "Account verified! You can now log in."
    })))
}

/// POST /api/resend-otp
pub async fn resend_otp(
    body: web::Json<serde_json::Value>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    let email = body["email"].as_str().ok_or_else(|| AppError::bad_request("Email required"))?;

    let user = sb
        .query_single("app_users", "*", &[("email", &format!("eq.{}", email))])
        .await?;

    let user = match user {
        Some(u) => u,
        None => return Err(AppError::bad_request("User not found")),
    };

    if user["is_verified"].as_bool().unwrap_or(false) {
        return Err(AppError::bad_request("Account already verified"));
    }

    // Generate new OTP
    use rand::Rng;
    let otp_code: String = format!("{:06}", rand::thread_rng().gen_range(100000..999999));
    let otp_expires = chrono::Utc::now() + chrono::Duration::minutes(15);

    let user_id = user["id"].as_str().unwrap_or("");
    sb.update(
        "app_users",
        &json!({
            "otp_code": otp_code,
            "otp_expires_at": otp_expires.to_rfc3339()
        }),
        &[("id", &format!("eq.{}", user_id))],
    )
    .await?;

    let username = user["username"].as_str().unwrap_or("User");
    let _ = send_otp_email(email, &otp_code, username).await;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "message": "New verification code sent!"
    })))
}

/// Send OTP email using Supabase's built-in email (via database function + pg_net)
/// Falls back to console logging if not configured
async fn send_otp_email(to_email: &str, otp_code: &str, username: &str) -> Result<(), String> {
    let supabase_url = std::env::var("VITE_SUPABASE_URL").unwrap_or_default();
    let service_key = std::env::var("SUPABASE_SERVICE_ROLE_KEY").unwrap_or_default();

    if supabase_url.is_empty() || service_key.is_empty() {
        log::warn!("Supabase not configured. OTP code for {}: {}", to_email, otp_code);
        return Ok(());
    }

    // Try to send via Supabase RPC function (send_otp_email)
    // This uses pg_net extension to send emails from within Postgres
    let client = reqwest::Client::new();
    let resp = client
        .post(&format!("{}/rest/v1/rpc/send_otp_email", supabase_url))
        .header("apikey", &service_key)
        .header("Authorization", &format!("Bearer {}", service_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "p_email": to_email,
            "p_otp_code": otp_code,
            "p_username": username
        }))
        .send()
        .await;

    match resp {
        Ok(r) if r.status().is_success() => {
            log::info!("OTP email sent to {} via Supabase", to_email);
            Ok(())
        }
        Ok(r) => {
            let status = r.status();
            let text = r.text().await.unwrap_or_default();
            log::warn!("Supabase email RPC returned {}: {}. OTP for {}: {}", status, text, to_email, otp_code);
            Ok(()) // Don't fail registration
        }
        Err(e) => {
            log::warn!("Failed to call Supabase email RPC: {}. OTP for {}: {}", e, to_email, otp_code);
            Ok(()) // Don't fail registration
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/login").route(web::post().to(login)),
    )
    .service(
        web::resource("/api/register").route(web::post().to(register)),
    )
    .service(
        web::resource("/api/verify-otp").route(web::post().to(verify_otp)),
    )
    .service(
        web::resource("/api/resend-otp").route(web::post().to(resend_otp)),
    );
}

use actix_web::{web, HttpResponse};
use serde_json::json;

use crate::error::AppError;
use crate::models::{LoginRequest, RegisterRequest};
use crate::supabase::SupabaseClient;

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

    let stored_password = user["password"].as_str().unwrap_or("");
    if stored_password != body.password {
        return Err(AppError::unauthorized("Invalid credentials"));
    }

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "email": user["email"]
        }
    })))
}

pub async fn register(
    body: web::Json<RegisterRequest>,
    sb: web::Data<SupabaseClient>,
) -> Result<HttpResponse, AppError> {
    if body.username.is_empty() || body.password.is_empty() || body.email.is_empty() {
        return Err(AppError::bad_request("All fields required"));
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

    let new_user = sb
        .insert_single(
            "app_users",
            &json!({
                "username": body.username,
                "password": body.password,
                "email": body.email,
                "role": "customer",
                "is_verified": true
            }),
        )
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "user": {
            "id": new_user["id"],
            "username": new_user["username"],
            "role": new_user["role"],
            "email": new_user["email"]
        }
    })))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/login").route(web::post().to(login)),
    )
    .service(
        web::resource("/api/register").route(web::post().to(register)),
    );
}

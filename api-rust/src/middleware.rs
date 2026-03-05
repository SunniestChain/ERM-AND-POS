use actix_web::{HttpRequest, FromRequest};
use serde::{Deserialize, Serialize};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};

use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,     // user id
    pub role: String,    // user role
    pub exp: usize,      // expiry timestamp
}

/// Create a JWT token for a user
pub fn create_jwt(user_id: &str, role: &str) -> Result<String, AppError> {
    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "mayco_diesel_default_jwt_secret_change_me".to_string());

    let claims = Claims {
        sub: user_id.to_string(),
        role: role.to_string(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::internal(format!("Failed to create token: {}", e)))
}

/// Validate a JWT token and return claims
pub fn validate_jwt(token: &str) -> Result<Claims, AppError> {
    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "mayco_diesel_default_jwt_secret_change_me".to_string());

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
            AppError::unauthorized("Token expired")
        }
        _ => AppError::unauthorized("Invalid token"),
    })?;

    Ok(token_data.claims)
}

/// Extractor for authenticated users — add to any route handler to require auth
/// Usage: `async fn handler(auth: AuthUser) -> ...`
pub struct AuthUser {
    #[allow(dead_code)]
    pub user_id: String,
    pub role: String,
}

impl FromRequest for AuthUser {
    type Error = AppError;
    type Future = std::pin::Pin<Box<dyn std::future::Future<Output = Result<Self, Self::Error>>>>;

    fn from_request(req: &HttpRequest, _payload: &mut actix_web::dev::Payload) -> Self::Future {
        let auth_header = req
            .headers()
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        Box::pin(async move {
            let header = auth_header.ok_or_else(|| {
                AppError::unauthorized("Missing Authorization header")
            })?;

            let token = header
                .strip_prefix("Bearer ")
                .ok_or_else(|| AppError::unauthorized("Invalid Authorization format"))?;

            let claims = validate_jwt(token)?;

            Ok(AuthUser {
                user_id: claims.sub,
                role: claims.role,
            })
        })
    }
}

/// Optional auth extractor — doesn't fail if no token, just returns None
#[allow(dead_code)]
pub struct OptionalAuth(pub Option<AuthUser>);

impl FromRequest for OptionalAuth {
    type Error = AppError;
    type Future = std::pin::Pin<Box<dyn std::future::Future<Output = Result<Self, Self::Error>>>>;

    fn from_request(req: &HttpRequest, _payload: &mut actix_web::dev::Payload) -> Self::Future {
        let auth_header = req
            .headers()
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        Box::pin(async move {
            if let Some(header) = auth_header {
                if let Some(token) = header.strip_prefix("Bearer ") {
                    if let Ok(claims) = validate_jwt(token) {
                        return Ok(OptionalAuth(Some(AuthUser {
                            user_id: claims.sub,
                            role: claims.role,
                        })));
                    }
                }
            }
            Ok(OptionalAuth(None))
        })
    }
}

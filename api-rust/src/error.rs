use actix_web::{HttpResponse, ResponseError};
use std::fmt;

#[derive(Debug)]
pub struct AppError {
    pub message: String,
    pub status: u16,
}

impl AppError {
    pub fn internal(msg: impl Into<String>) -> Self {
        AppError {
            message: msg.into(),
            status: 500,
        }
    }

    pub fn bad_request(msg: impl Into<String>) -> Self {
        AppError {
            message: msg.into(),
            status: 400,
        }
    }

    pub fn unauthorized(msg: impl Into<String>) -> Self {
        AppError {
            message: msg.into(),
            status: 401,
        }
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let status = actix_web::http::StatusCode::from_u16(self.status)
            .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR);
        HttpResponse::build(status).json(serde_json::json!({ "error": self.message }))
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        AppError::internal(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::internal(err.to_string())
    }
}

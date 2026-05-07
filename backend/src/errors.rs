use actix_web::{HttpResponse, ResponseError};
use std::fmt;

#[derive(Debug)]
pub enum AppError {
    InternalError(String),
    BadRequest(String),
    Unauthorized(String),
    NotFound(String),
    Forbidden(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::InternalError(msg) => write!(f, "Ichki xatolik: {}", msg),
            AppError::BadRequest(msg) => write!(f, "Noto'g'ri so'rov: {}", msg),
            AppError::Unauthorized(msg) => write!(f, "Avtorizatsiya xatosi: {}", msg),
            AppError::NotFound(msg) => write!(f, "Topilmadi: {}", msg),
            AppError::Forbidden(msg) => write!(f, "Ruxsat etilmagan: {}", msg),
        }
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let (status, message) = match self {
            AppError::InternalError(msg) => {
                (actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, msg.clone())
            }
            AppError::BadRequest(msg) => {
                (actix_web::http::StatusCode::BAD_REQUEST, msg.clone())
            }
            AppError::Unauthorized(msg) => {
                (actix_web::http::StatusCode::UNAUTHORIZED, msg.clone())
            }
            AppError::NotFound(msg) => {
                (actix_web::http::StatusCode::NOT_FOUND, msg.clone())
            }
            AppError::Forbidden(msg) => {
                (actix_web::http::StatusCode::FORBIDDEN, msg.clone())
            }
        };

        HttpResponse::build(status).json(serde_json::json!({
            "error": true,
            "message": message
        }))
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        tracing::error!("Database xatosi: {:?}", err);
        AppError::InternalError("Ma'lumotlar bazasi xatosi".to_string())
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        tracing::error!("JWT xatosi: {:?}", err);
        AppError::Unauthorized("Token yaroqsiz".to_string())
    }
}

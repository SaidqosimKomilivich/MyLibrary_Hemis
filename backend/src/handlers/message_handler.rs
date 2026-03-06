use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use std::str::FromStr;
use uuid::Uuid;

use crate::dto::message::{SendMessageDto, UnreadCountDto};
use crate::errors::AppError;
use crate::middleware::auth_middleware::{Claims, require_role};
use crate::repository::message_repository::MessageRepository;
use crate::services::message_service::MessageService;

/// GET /api/messages/stream
/// Server-Sent Events stream for real-time notifications
pub async fn message_stream(
    claims: Claims,
    message_service: web::Data<std::sync::Arc<MessageService>>,
) -> Result<HttpResponse, actix_web::Error> {
    let user_id = Uuid::from_str(&claims.sub).map_err(|_| actix_web::error::ErrorUnauthorized("Invalid user ID"))?;
    
    // Subscribe to the message service for this specific user
    let mut rx = message_service.subscribe(user_id);

    // Create an async stream that yields bytes in SSE format
    let stream = async_stream::stream! {
        while let Ok(msg) = rx.recv().await {
            let json = serde_json::to_string(&msg).unwrap_or_default();
            let sse_data = format!("event: message\ndata: {}\n\n", json);
            yield Ok::<_, actix_web::Error>(actix_web::web::Bytes::from(sse_data));
        }
    };

    Ok(HttpResponse::Ok()
        .content_type("text/event-stream")
        .insert_header(("Cache-Control", "no-cache"))
        .insert_header(("Connection", "keep-alive"))
        .streaming(stream))
}

/// GET /api/messages
/// Returns the authenticated user's messages
pub async fn get_my_messages(
    claims: Claims,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let user_id = Uuid::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;
    
    let messages = if claims.role == "admin" || claims.role == "staff" {
        MessageRepository::get_all_messages(pool.get_ref()).await?
    } else {
        MessageRepository::get_user_messages(pool.get_ref(), user_id).await?
    };
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": messages
    })))
}

/// GET /api/messages/unread
/// Returns the number of unread messages for the user
pub async fn get_unread_count(
    claims: Claims,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let user_id = Uuid::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;
    
    let unread_count = MessageRepository::count_unread(pool.get_ref(), user_id).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": UnreadCountDto { unread_count }
    })))
}

/// POST /api/messages
/// Sends a message to a user
pub async fn send_message(
    claims: Claims,
    pool: web::Data<PgPool>,
    message_service: web::Data<std::sync::Arc<crate::services::message_service::MessageService>>,
    payload: web::Json<SendMessageDto>,
) -> Result<HttpResponse, actix_web::Error> {
    // FAQAT admin va staff ruxsat etiladi
    if let Err(resp) = require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let sender_id = Uuid::from_str(&claims.sub).map_err(|_| {
        actix_web::error::ErrorUnauthorized("Invalid token format")
    })?;
    
    // Save to DB
    let saved_msg = MessageRepository::create(pool.get_ref(), Some(sender_id), &payload).await.map_err(actix_web::error::ErrorInternalServerError)?;
    
    // Push real-time notification
    message_service.send_message(payload.receiver_id, saved_msg.clone());
    
    Ok(HttpResponse::Created().json(serde_json::json!({
        "success": true,
        "data": saved_msg,
        "message": "Xabar muvaffaqiyatli yuborildi."
    })))
}

/// PATCH /api/messages/{id}/read
/// Marks a specific message as read
pub async fn mark_as_read(
    claims: Claims,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = Uuid::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;
    let message_id = path.into_inner();
    
    MessageRepository::mark_as_read(pool.get_ref(), message_id, user_id).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Xabar o'qilgan deb belgilandi."
    })))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/messages")
            .route("/stream", web::get().to(message_stream))
            .route("", web::get().to(get_my_messages))
            .route("", web::post().to(send_message))
            .route("/unread", web::get().to(get_unread_count))
            .route("/{id}/read", web::patch().to(mark_as_read))
    );
}

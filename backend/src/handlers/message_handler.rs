use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use std::str::FromStr;
use uuid::Uuid;

use crate::dto::message::{SendMessageDto, UnreadCountDto, PaginatedMessageResponse, AnnouncementReadStatusResponse};
use crate::errors::AppError;
use crate::middleware::auth_middleware::{Claims, require_role};
use crate::repository::message_repository::MessageRepository;
use crate::repository::announcement_repository::AnnouncementRepository;
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
    query: web::Query<crate::dto::news::NewsListParams>,
) -> Result<HttpResponse, AppError> {
    let user_id = Uuid::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;
    let page = query.page.unwrap_or(1).max(1);
    let per_page = 10_i64;
    let offset = (page - 1) * per_page;
    
    let (messages, total) = if claims.role == "admin" || claims.role == "staff" {
        let msgs = MessageRepository::get_all_conversations_paginated(pool.get_ref(), per_page, offset).await?;
        let count = MessageRepository::count_all_conversations(pool.get_ref()).await?;
        (msgs, count)
    } else {
        let msgs = MessageRepository::get_user_conversations_paginated(pool.get_ref(), user_id, per_page, offset).await?;
        let count = MessageRepository::count_user_conversations(pool.get_ref(), user_id).await?;
        (msgs, count)
    };

    let total_pages = (total + per_page - 1) / per_page;
    
    Ok(HttpResponse::Ok().json(PaginatedMessageResponse {
        success: true,
        data: messages,
        pagination: crate::dto::news::NewsPagination {
            current_page: page,
            per_page,
            total_items: total,
            total_pages,
        },
    }))
}

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENT endpoints
// ─────────────────────────────────────────────────────────────

/// GET /api/announcements
pub async fn get_announcements(
    claims: Claims,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let user_id = Uuid::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;
    let announcements = AnnouncementRepository::list_for_user(pool.get_ref(), user_id).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": announcements
    })))
}

/// PATCH /api/announcements/{id}/read
pub async fn mark_announcement_as_read(
    claims: Claims,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = Uuid::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;
    let announcement_id = path.into_inner();
    
    AnnouncementRepository::mark_as_read(pool.get_ref(), user_id, announcement_id).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "E'lon o'qilgan deb belgilandi."
    })))
}

/// GET /api/announcements/{id}/read-status
/// Admin only: paginated list of users who read it
pub async fn get_announcement_read_status(
    claims: Claims,
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    query: web::Query<crate::dto::news::NewsListParams>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let announcement_id = path.into_inner();
    let page = query.page.unwrap_or(1).max(1);
    
    let (data, total) = AnnouncementRepository::get_read_status_paginated(pool.get_ref(), announcement_id, page).await?;
    let per_page = 5_i64; // SHARED REQUIREMENT: 5 users per page
    let total_pages = (total + per_page - 1) / per_page;

    Ok(HttpResponse::Ok().json(AnnouncementReadStatusResponse {
        success: true,
        data,
        pagination: crate::dto::news::NewsPagination {
            current_page: page,
            per_page,
            total_items: total,
            total_pages,
        },
    }))
}

/// POST /api/announcements
/// Admin only: broadcast a standalone announcement to all users
pub async fn create_announcement(
    claims: Claims,
    pool: web::Data<PgPool>,
    message_service: web::Data<std::sync::Arc<MessageService>>,
    body: web::Json<crate::dto::news::CreateNewsRequest>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let author_id = Uuid::from_str(&claims.sub).ok();
    
    // Create the announcement in DB
    let announcement = AnnouncementRepository::create(
        pool.get_ref(),
        author_id,
        &body.title,
        &body.content,
        body.category.clone(),
        Some(body.images.clone()),
    ).await?;

    // Broadcast real-time
    message_service.broadcast_announcement(crate::models::announcement::AnnouncementWithStatus {
        id: announcement.id,
        sender_id: announcement.sender_id,
        sender_name: None, 
        title: announcement.title.clone(),
        message: announcement.message.clone(),
        category: announcement.category.clone(),
        images: announcement.images.clone(),
        is_read: false,
        created_at: announcement.created_at,
    });

    Ok(HttpResponse::Created().json(serde_json::json!({
        "success": true,
        "message": "E'lon muvaffaqiyatli yuborildi.",
        "data": announcement
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
    // FAQAT admin, staff va teacher ruxsat etiladi
    if let Err(resp) = require_role(&claims, &["admin", "staff", "teacher"]) {
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

/// GET /api/messages/history/{contact_id}
/// Returns full chat history between me and contact_id
pub async fn get_chat_history(
    claims: Claims,
    pool: web::Data<PgPool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let user_id = Uuid::from_str(&claims.sub).map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;
    let contact_id_str = path.into_inner();
    
    let messages = if contact_id_str == "system" {
        MessageRepository::get_system_chat_history(pool.get_ref(), user_id).await?
    } else if let Ok(contact_id) = Uuid::from_str(&contact_id_str) {
        MessageRepository::get_chat_history(pool.get_ref(), user_id, contact_id).await?
    } else {
        return Err(AppError::BadRequest("Noto'g'ri foydalanuvchi ID".to_string()));
    };
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": messages
    })))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/messages")
            .route("/stream", web::get().to(message_stream))
            .route("", web::get().to(get_my_messages))
            .route("/history/{contact_id}", web::get().to(get_chat_history))
            .route("", web::post().to(send_message))
            .route("/unread", web::get().to(get_unread_count))
            .route("/{id}/read", web::patch().to(mark_as_read))
    );
    cfg.service(
        web::scope("/api/announcements")
            .route("", web::get().to(get_announcements))
            .route("", web::post().to(create_announcement))
            .route("/{id}/read", web::patch().to(mark_announcement_as_read))
            .route("/{id}/read-status", web::get().to(get_announcement_read_status))
    );
}

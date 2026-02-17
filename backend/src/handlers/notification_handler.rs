use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::notification::CreateNotificationRequest;
use crate::middleware::auth_middleware::Claims;
use crate::repository::notification_repository::NotificationRepository;
use crate::errors::AppError;

/// POST /api/notifications (Admin/Staff only)
pub async fn send_notification(
    pool: web::Data<PgPool>,
    claims: Claims,
    body: web::Json<CreateNotificationRequest>,
) -> Result<HttpResponse, AppError> {
    // Check role
    if claims.role != "admin" && claims.role != "staff" {
        return Err(AppError::Forbidden("Huquqingiz yetarli emas".to_string()));
    }

    let sender_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::InternalError("UUID noto'g'ri".to_string()))?;

    NotificationRepository::create(pool.get_ref(), &body.into_inner(), Some(sender_id)).await?;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "success": true,
        "message": "Xabarnoma yuborildi"
    })))
}

/// GET /api/notifications/my
pub async fn get_my_notifications(
    pool: web::Data<PgPool>,
    claims: Claims,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::InternalError("UUID noto'g'ri".to_string()))?;

    let limit = query.get("limit").and_then(|v| v.parse().ok()).unwrap_or(10);
    let offset = query.get("offset").and_then(|v| v.parse().ok()).unwrap_or(0);

    let notifications = NotificationRepository::find_by_user(pool.get_ref(), user_id, limit, offset).await?;
    let unread_count = NotificationRepository::get_unread_count(pool.get_ref(), user_id).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": notifications,
        "unread_count": unread_count
    })))
}

/// PUT /api/notifications/{id}/read
pub async fn mark_as_read(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::InternalError("UUID noto'g'ri".to_string()))?;

    let notification_id = path.into_inner();

    NotificationRepository::mark_as_read(pool.get_ref(), notification_id, user_id).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "O'qilgan deb belgilandi"
    })))
}

/// PUT /api/notifications/read-all
pub async fn mark_all_as_read(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::InternalError("UUID noto'g'ri".to_string()))?;

    NotificationRepository::mark_all_as_read(pool.get_ref(), user_id).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Barchasi o'qilgan deb belgilandi"
    })))
}

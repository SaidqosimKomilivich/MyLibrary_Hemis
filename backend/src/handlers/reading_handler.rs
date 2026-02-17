use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::reading::CreateReadingRequest;
use crate::errors::AppError;
use crate::middleware::auth_middleware::Claims;
use crate::services::reading_service::ReadingService;

/// POST /api/readings — Kitob o'qishni boshlash
pub async fn start_reading(
    pool: web::Data<PgPool>,
    claims: Claims,
    body: web::Json<CreateReadingRequest>,
) -> Result<HttpResponse, AppError> {
    let user_id = &claims.sub;
    let response = ReadingService::start_reading(pool.get_ref(), user_id, body.into_inner()).await?;
    Ok(HttpResponse::Created().json(response))
}

/// GET /api/readings — Foydalanuvchining o'qiyotgan kitoblari
pub async fn get_readings(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    let user_id = &claims.sub;
    let response = ReadingService::get_user_readings(pool.get_ref(), user_id).await?;
    Ok(HttpResponse::Ok().json(response))
}

/// DELETE /api/readings/{id} — O'qishni o'chirish
pub async fn remove_reading(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = &claims.sub;
    let reading_id = path.into_inner();
    let response = ReadingService::remove_reading(pool.get_ref(), reading_id, user_id).await?;
    Ok(HttpResponse::Ok().json(response))
}

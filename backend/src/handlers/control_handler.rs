use actix_web::{web, HttpResponse};
use sqlx::PgPool;

use crate::errors::AppError;
use crate::middleware::auth_middleware::Claims;
use crate::services::control_service::ControlService;

/// POST /api/control/arrive — Foydalanuvchi keldi
pub async fn arrive(pool: web::Data<PgPool>, claims: Claims) -> Result<HttpResponse, AppError> {
    let user_id = &claims.sub;
    let response = ControlService::arrive(pool.get_ref(), user_id).await?;
    Ok(HttpResponse::Created().json(response))
}

/// POST /api/control/depart — Foydalanuvchi ketdi
pub async fn depart(pool: web::Data<PgPool>, claims: Claims) -> Result<HttpResponse, AppError> {
    let user_id = &claims.sub;
    let response = ControlService::depart(pool.get_ref(), user_id).await?;
    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/control/history — O'z kelish-ketish tarixini ko'rish
pub async fn get_history(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    let user_id = &claims.sub;
    let response = ControlService::get_user_history(pool.get_ref(), user_id).await?;
    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/control/today — Bugungi barcha foydalanuvchilar (admin)
pub async fn get_today(pool: web::Data<PgPool>, _claims: Claims) -> Result<HttpResponse, AppError> {
    let response = ControlService::get_today_all(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(response))
}

use actix_web::{web, HttpResponse};
use sqlx::PgPool;

use crate::dto::control::ControlRequest;
use crate::errors::AppError;
use crate::middleware::auth_middleware::Claims;
use crate::services::control_service::ControlService;

/// POST /api/control/arrive — Foydalanuvchi keldi
pub async fn arrive(
    pool: web::Data<PgPool>, 
    claims: Claims,
    payload: Option<web::Json<ControlRequest>>,
) -> Result<HttpResponse, AppError> {
    let mut target_user_id = claims.sub.clone();
    
    // Agar body yuborilgan bo'lsa va so'rov yuboruvchi admin/staff bo'lsa
    if let Some(req) = payload {
        if let Some(uid) = &req.user_id {
            if claims.role == "admin" || claims.role == "staff" || claims.role == "employee" {
                target_user_id = uid.clone();
            }
        }
    }

    let response = ControlService::arrive(pool.get_ref(), &target_user_id).await?;
    Ok(HttpResponse::Created().json(response))
}

/// POST /api/control/depart — Foydalanuvchi ketdi
pub async fn depart(
    pool: web::Data<PgPool>, 
    claims: Claims,
    payload: Option<web::Json<ControlRequest>>,
) -> Result<HttpResponse, AppError> {
    let mut target_user_id = claims.sub.clone();
    
    // Agar body yuborilgan bo'lsa va so'rov yuboruvchi admin/staff bo'lsa
    if let Some(req) = payload {
        if let Some(uid) = &req.user_id {
            if claims.role == "admin" || claims.role == "staff" || claims.role == "employee" {
                target_user_id = uid.clone();
            }
        }
    }

    let response = ControlService::depart(pool.get_ref(), &target_user_id).await?;
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

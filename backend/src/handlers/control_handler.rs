use actix_web::{web, HttpResponse};
use sqlx::PgPool;

use crate::dto::control::ControlRequest;
use crate::errors::AppError;
use crate::middleware::auth_middleware::Claims;
use crate::repository::user_repository::UserRepository;
use crate::services::control_service::ControlService;

/// claims.sub (UUID) dan foydalanuvchining HEMIS user_id sini aniqlash
async fn resolve_user_id(pool: &PgPool, claims_sub: &str) -> Result<String, AppError> {
    if let Ok(user_uuid) = uuid::Uuid::parse_str(claims_sub) {
        if let Some(user) = UserRepository::find_by_id(pool, user_uuid).await? {
            return Ok(user.user_id);
        }
    }
    // Agar UUID bo'lmasa yoki topilmasa, o'zi qaytadi
    Ok(claims_sub.to_string())
}

/// POST /api/control/arrive — Foydalanuvchi keldi
pub async fn arrive(
    pool: web::Data<PgPool>, 
    claims: Claims,
    payload: Option<web::Json<ControlRequest>>,
) -> Result<HttpResponse, AppError> {
    let mut target_user_id = None;
    
    // Agar body yuborilgan bo'lsa va so'rov yuboruvchi admin/staff/employee bo'lsa
    if let Some(req) = payload {
        if let Some(uid) = &req.user_id {
            if claims.role == "admin" || claims.role == "staff" || claims.role == "employee" {
                target_user_id = Some(uid.clone());
            }
        }
    }

    let final_user_id = match target_user_id {
        Some(uid) => resolve_user_id(pool.get_ref(), &uid).await?,
        None => resolve_user_id(pool.get_ref(), &claims.sub).await?,
    };

    let response = ControlService::arrive(pool.get_ref(), &final_user_id).await?;
    Ok(HttpResponse::Created().json(response))
}

/// POST /api/control/depart — Foydalanuvchi ketdi
pub async fn depart(
    pool: web::Data<PgPool>, 
    claims: Claims,
    payload: Option<web::Json<ControlRequest>>,
) -> Result<HttpResponse, AppError> {
    let mut target_user_id = None;
    
    // Agar body yuborilgan bo'lsa va so'rov yuboruvchi admin/staff/employee bo'lsa
    if let Some(req) = payload {
        if let Some(uid) = &req.user_id {
            if claims.role == "admin" || claims.role == "staff" || claims.role == "employee" {
                target_user_id = Some(uid.clone());
            }
        }
    }

    let final_user_id = match target_user_id {
        Some(uid) => resolve_user_id(pool.get_ref(), &uid).await?,
        None => resolve_user_id(pool.get_ref(), &claims.sub).await?,
    };

    let response = ControlService::depart(pool.get_ref(), &final_user_id).await?;
    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/control/history — O'z kelish-ketish tarixini ko'rish
pub async fn get_history(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    let hemis_id = resolve_user_id(pool.get_ref(), &claims.sub).await?;
    let response = ControlService::get_user_history(pool.get_ref(), &hemis_id).await?;
    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/control/today — Bugungi barcha foydalanuvchilar (admin)
pub async fn get_today(pool: web::Data<PgPool>, _claims: Claims) -> Result<HttpResponse, AppError> {
    let response = ControlService::get_today_all(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(response))
}

use actix_web::{web, HttpResponse};
use sqlx::PgPool;

use crate::config::Config;
use crate::middleware::auth_middleware::{require_role, Claims};
use crate::services::hemis_service::HemisService;

/// POST /api/sync/students
/// HEMIS API dan talabalarni sinxronlash (faqat admin uchun)
pub async fn sync_students(
    claims: Claims,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin", "teacher"]) {
        return Ok(resp);
    }

    tracing::info!(
        user = %claims.sub,
        role = %claims.role,
        "HEMIS talabalar sinxronlashi boshlandi"
    );

    match HemisService::sync_students(pool.get_ref(), config.get_ref()).await {
        Ok(result) => Ok(HttpResponse::Ok().json(result)),
        Err(e) => {
            tracing::error!("HEMIS sinxronlash xatosi: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "message": format!("Sinxronlash xatosi: {}", e)
            })))
        }
    }
}

/// GET /api/sync/students
/// Bazadagi barcha talabalarni olish
pub async fn get_students(
    claims: Claims,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin", "teacher", "employee"]) {
        return Ok(resp);
    }

    match crate::repository::user_repository::UserRepository::find_all_by_role(
        pool.get_ref(),
        "student",
    )
    .await
    {
        Ok(users) => {
            let user_responses: Vec<crate::dto::user::UserResponse> =
                users.into_iter().map(|u| u.into()).collect();
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": user_responses
            })))
        }
        Err(e) => {
            tracing::error!("Talabalarni olishda xato: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "message": format!("{}", e)
            })))
        }
    }
}

/// POST /api/sync/teachers
/// HEMIS API dan o'qituvchilarni sinxronlash (faqat admin uchun)
pub async fn sync_teachers(
    claims: Claims,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    tracing::info!(
        user = %claims.sub,
        "HEMIS o'qituvchilar sinxronlashi boshlandi"
    );

    match HemisService::sync_employees(pool.get_ref(), config.get_ref(), "teacher", "teacher").await
    {
        Ok(result) => Ok(HttpResponse::Ok().json(result)),
        Err(e) => {
            tracing::error!("HEMIS o'qituvchilar sinxronlash xatosi: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "message": format!("Sinxronlash xatosi: {}", e)
            })))
        }
    }
}

/// GET /api/sync/teachers
/// Bazadagi barcha o'qituvchilarni olish
pub async fn get_teachers(
    claims: Claims,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin", "teacher", "employee"]) {
        return Ok(resp);
    }

    match crate::repository::user_repository::UserRepository::find_all_by_role(
        pool.get_ref(),
        "teacher",
    )
    .await
    {
        Ok(users) => {
            let user_responses: Vec<crate::dto::user::UserResponse> =
                users.into_iter().map(|u| u.into()).collect();
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": user_responses
            })))
        }
        Err(e) => {
            tracing::error!("O'qituvchilarni olishda xato: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "message": format!("{}", e)
            })))
        }
    }
}

/// POST /api/sync/employees
/// HEMIS API dan xodimlarni sinxronlash (faqat admin uchun)
pub async fn sync_employees(
    claims: Claims,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    tracing::info!(
        user = %claims.sub,
        "HEMIS xodimlar sinxronlashi boshlandi"
    );

    match HemisService::sync_employees(pool.get_ref(), config.get_ref(), "employee", "staff").await
    {
        Ok(result) => Ok(HttpResponse::Ok().json(result)),
        Err(e) => {
            tracing::error!("HEMIS xodimlar sinxronlash xatosi: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "message": format!("Sinxronlash xatosi: {}", e)
            })))
        }
    }
}

/// GET /api/sync/employees
/// Bazadagi barcha xodimlarni olish
pub async fn get_employees(
    claims: Claims,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin", "teacher", "employee"]) {
        return Ok(resp);
    }

    match crate::repository::user_repository::UserRepository::find_all_by_role(
        pool.get_ref(),
        "staff",
    )
    .await
    {
        Ok(users) => {
            let user_responses: Vec<crate::dto::user::UserResponse> =
                users.into_iter().map(|u| u.into()).collect();
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": user_responses
            })))
        }
        Err(e) => {
            tracing::error!("Xodimlarni olishda xato: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "message": format!("{}", e)
            })))
        }
    }
}

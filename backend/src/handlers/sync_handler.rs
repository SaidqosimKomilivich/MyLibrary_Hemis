use actix_web::{web, HttpResponse};
use sqlx::PgPool;

use crate::config::Config;
use crate::dto::user::{PaginatedUsersResponse, UserPaginationInfo, UserPaginationParams};
use crate::errors::AppError;
use crate::middleware::auth_middleware::{require_role, Claims};
use crate::repository::user_repository::UserRepository;
use crate::services::hemis_service::HemisService;

const DEFAULT_PER_PAGE: i64 = 20;

/// Umumiy paginatsiyali GET handler (students, teachers, employees uchun)
async fn get_users_paginated(
    pool: &PgPool,
    role: &str,
    params: UserPaginationParams,
) -> Result<HttpResponse, actix_web::Error> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(DEFAULT_PER_PAGE).max(1).min(100);
    let search = params.search.as_deref();
    let status = params.status.as_deref();

    let total_items = UserRepository::count_by_role(pool, role, search, status)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let total_pages = if total_items == 0 {
        1
    } else {
        (total_items as f64 / per_page as f64).ceil() as i64
    };

    let users = UserRepository::find_paginated_by_role(pool, role, page, per_page, search, status)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let user_responses: Vec<crate::dto::user::UserResponse> =
        users.into_iter().map(|u| u.into()).collect();

    Ok(HttpResponse::Ok().json(PaginatedUsersResponse {
        success: true,
        data: user_responses,
        pagination: UserPaginationInfo {
            current_page: page,
            per_page,
            total_items,
            total_pages,
        },
    }))
}

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
/// Bazadagi talabalarni paginatsiya bilan olish
pub async fn get_students(
    claims: Claims,
    pool: web::Data<PgPool>,
    query: web::Query<UserPaginationParams>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin", "teacher", "employee"]) {
        return Ok(resp);
    }

    get_users_paginated(pool.get_ref(), "student", query.into_inner()).await
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
/// Bazadagi o'qituvchilarni paginatsiya bilan olish
pub async fn get_teachers(
    claims: Claims,
    pool: web::Data<PgPool>,
    query: web::Query<UserPaginationParams>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin", "teacher", "employee"]) {
        return Ok(resp);
    }

    get_users_paginated(pool.get_ref(), "teacher", query.into_inner()).await
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
/// Bazadagi xodimlarni paginatsiya bilan olish
pub async fn get_employees(
    claims: Claims,
    pool: web::Data<PgPool>,
    query: web::Query<UserPaginationParams>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin", "teacher", "employee"]) {
        return Ok(resp);
    }

    get_users_paginated(pool.get_ref(), "staff", query.into_inner()).await
}

/// GET /api/users/{id} - ID orqali foydalanuvchini olish (Kamera skaneri uchun)
pub async fn get_user_by_id(
    // require_role ishlatish ixtiyoriy, agar auth middleware bo'lsa
    pool: web::Data<PgPool>,
    path: web::Path<uuid::Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();
    
    let user = UserRepository::find_by_id_any(pool.get_ref(), user_id).await?;
    
    if let Some(u) = user {
        let response: crate::dto::user::UserResponse = u.into();
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": response
        })))
    } else {
        Err(AppError::NotFound("Foydalanuvchi topilmadi".to_string()))
    }
}

/// PUT /api/users/{id}/role
/// Faqat admin: foydalanuvchi rolini o'zgartirish
pub async fn update_user_role(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<uuid::Uuid>,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    let target_id = path.into_inner();
    let new_role = body.get("role")
        .and_then(|v| v.as_str())
        .ok_or_else(|| actix_web::error::ErrorBadRequest("'role' maydoni talab qilinadi"))?;

    // Ruxsat etilgan rollar
    let allowed_roles = ["admin", "staff", "teacher", "student"];
    if !allowed_roles.contains(&new_role) {
        return Err(actix_web::error::ErrorBadRequest(format!(
            "Noto'g'ri rol: '{}'. Ruxsat etilgan rollar: {:?}", new_role, allowed_roles
        )));
    }

    // Foydalanuvchini tekshirish
    UserRepository::find_by_id_any(pool.get_ref(), target_id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound("Foydalanuvchi topilmadi"))?;

    UserRepository::update_role(pool.get_ref(), target_id, new_role)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    tracing::info!(target_user = %target_id, admin = %claims.sub, new_role = %new_role, "Rol o'zgartirildi");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": format!("Rol '{}' ga o'zgartirildi", new_role)
    })))
}

/// PUT /api/users/{id}/status
/// Faqat admin: foydalanuvchi faol/nofaol holatini o'zgartirish
pub async fn update_user_status(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<uuid::Uuid>,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    let target_id = path.into_inner();
    let active = body.get("active")
        .and_then(|v| v.as_bool())
        .ok_or_else(|| actix_web::error::ErrorBadRequest("'active' maydoni talab qilinadi (true/false)"))?;

    // Foydalanuvchini tekshirish
    let user = UserRepository::find_by_id_any(pool.get_ref(), target_id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound("Foydalanuvchi topilmadi"))?;

    UserRepository::update_active(pool.get_ref(), target_id, active)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let status_label = if active { "Faol" } else { "Nofaol" };
    tracing::info!(target_user = %user.user_id, admin = %claims.sub, active = %active, "Holat o'zgartirildi");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": format!("Foydalanuvchi holati '{}' ga o'zgartirildi", status_label)
    })))
}

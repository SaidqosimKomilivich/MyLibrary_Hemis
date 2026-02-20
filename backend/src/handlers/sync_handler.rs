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
    
    let user = UserRepository::find_by_id(pool.get_ref(), user_id).await?;
    
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

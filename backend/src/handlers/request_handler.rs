use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::request::{CreateBookRequestDto, UpdateRequestStatusDto, PaginatedRequestsResponse};
use crate::dto::user::{UserPaginationParams, UserPaginationInfo};
use crate::middleware::auth_middleware::{require_role, Claims};
use crate::repository::request_repository::RequestRepository;

/// POST /api/requests
/// Talaba yoki o'qituvchi kitob so'rovini yuborishi
pub async fn create_request(
    pool: web::Data<PgPool>,
    claims: Claims,
    body: web::Json<CreateBookRequestDto>,
) -> Result<HttpResponse, actix_web::Error> {
    let req = body.into_inner();
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| actix_web::error::ErrorBadRequest("Noto'g'ri identifikator"))?;

    let id = RequestRepository::create_request(pool.get_ref(), user_id, req)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "success": true,
        "message": "So'rov muvaffaqiyatli yuborildi",
        "request_id": id
    })))
}

/// GET /api/requests/my
/// Foydalanuvchi o'z so'rovlarini ko'rishi
pub async fn get_my_requests(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, actix_web::Error> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| actix_web::error::ErrorBadRequest("Noto'g'ri identifikator"))?;

    let requests = RequestRepository::get_user_requests(pool.get_ref(), user_id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": requests
    })))
}

/// GET /api/requests
/// Faqat xodim yoki admin barcha so'rovlarni ko'rishi (Paginatsiya bilan)
pub async fn get_all_requests(
    pool: web::Data<PgPool>,
    claims: Claims,
    query: web::Query<UserPaginationParams>,
) -> Result<HttpResponse, actix_web::Error> {
    // Ruxsat tekshirish
    if let Err(resp) = require_role(&claims, &["admin", "staff", "employee"]) {
        return Ok(resp);
    }

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).max(1);
    let search = query.search.as_deref();
    let status = query.status.as_deref();

    let (requests, total_items) = RequestRepository::get_all_requests(
        pool.get_ref(),
        page,
        per_page,
        search,
        status,
    )
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let total_pages = (total_items as f64 / per_page as f64).ceil() as i64;

    Ok(HttpResponse::Ok().json(PaginatedRequestsResponse {
        success: true,
        data: requests,
        pagination: UserPaginationInfo {
            current_page: page,
            per_page,
            total_items,
            total_pages,
        },
    }))
}

/// PUT /api/requests/{id}/status
/// Faqat xodim yoki admin so'rov holatini o'zgartirishi
pub async fn update_request_status(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<Uuid>,
    body: web::Json<UpdateRequestStatusDto>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin", "staff", "employee"]) {
        return Ok(resp);
    }

    let id = path.into_inner();
    let dto = body.into_inner();

    RequestRepository::update_request_status(pool.get_ref(), id, dto)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "So'rov holati yangilandi"
    })))
}

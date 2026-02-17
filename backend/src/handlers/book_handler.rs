use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::book::{CreateBookRequest, PaginationParams, UpdateBookRequest};
use crate::errors::AppError;
use crate::middleware::auth_middleware::{self, Claims};
use crate::services::book_service::BookService;

/// GET /api/books — Barcha foydalanuvchilar uchun (paginatsiya, 20 tadan)
pub async fn get_books(
    pool: web::Data<PgPool>,
    query: web::Query<PaginationParams>,
) -> Result<HttpResponse, AppError> {
    let response = BookService::get_books(pool.get_ref(), query.into_inner()).await?;
    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/books/{id} — Barcha foydalanuvchilar uchun
pub async fn get_book(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let book = BookService::get_book_by_id(pool.get_ref(), id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": book
    })))
}

/// POST /api/books — Admin va xodim uchun
pub async fn create_book(
    pool: web::Data<PgPool>,
    claims: Claims,
    body: web::Json<CreateBookRequest>,
) -> Result<HttpResponse, AppError> {
    // Admin yoki xodim tekshiruvi
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let book = BookService::create_book(pool.get_ref(), body.into_inner()).await?;
    Ok(HttpResponse::Created().json(serde_json::json!({
        "success": true,
        "message": "Kitob muvaffaqiyatli yaratildi",
        "data": book
    })))
}

/// PUT /api/books/{id} — Admin va xodim uchun
pub async fn update_book(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<Uuid>,
    body: web::Json<UpdateBookRequest>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let id = path.into_inner();
    let book = BookService::update_book(pool.get_ref(), id, body.into_inner()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Kitob muvaffaqiyatli yangilandi",
        "data": book
    })))
}

/// DELETE /api/books/{id} — Admin va xodim uchun (soft delete)
pub async fn delete_book(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let id = path.into_inner();
    BookService::delete_book(pool.get_ref(), id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Kitob muvaffaqiyatli o'chirildi"
    })))
}

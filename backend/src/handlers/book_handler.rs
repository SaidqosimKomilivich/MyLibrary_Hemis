use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::book::{CreateBookRequest, PaginationParams, UpdateBookRequest};
use crate::errors::AppError;
use crate::middleware::auth_middleware::{self, Claims};
use crate::services::book_service::BookService;

/// GET /api/books — Barcha foydalanuvchilar uchun (paginatsiya, 20 tadan)
/// Admin va xodim uchun: is_active filtr yo'q (hammasi ko'rinadi)
/// Oddiy foydalanuvchilar uchun: faqat is_active = true
pub async fn get_books(
    pool: web::Data<PgPool>,
    claims: Option<Claims>,
    query: web::Query<PaginationParams>,
) -> Result<HttpResponse, AppError> {
    let is_staff = claims.as_ref().map(|c| c.role == "admin" || c.role == "staff").unwrap_or(false);
    let response = BookService::get_books(pool.get_ref(), query.into_inner(), is_staff).await?;
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

/// POST /api/books/submit — O'qituvchi o'z kitobini taqdim etadi (is_active = false)
pub async fn submit_book(
    pool: web::Data<PgPool>,
    claims: Claims,
    body: web::Json<CreateBookRequest>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["teacher"]) {
        return Ok(resp);
    }

    let book = BookService::submit_book(pool.get_ref(), body.into_inner(), &claims.sub).await?;
    Ok(HttpResponse::Created().json(serde_json::json!({
        "success": true,
        "message": "Kitob muvaffaqiyatli taqdim etildi. Admin ko'rib chiqadi.",
        "data": book
    })))
}

/// PUT /api/books/{id}/toggle-active — Admin/xodim: is_active ni almashtirish
pub async fn toggle_book_active(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<Uuid>,
    body: Option<web::Json<crate::dto::book::ToggleActiveRequest>>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let id = path.into_inner();
    let comment = body.and_then(|b| b.into_inner().admin_comment);
    let book = BookService::toggle_active(pool.get_ref(), id, comment).await?;
    let status = if book.is_active.unwrap_or(false) { "faollashtirildi" } else { "nofaollashtirildi" };
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": format!("Kitob muvaffaqiyatli {}", status),
        "data": book
    })))
}

/// GET /api/books/pending — Admin/xodim: kutilayotgan kitoblar (is_active = false)
pub async fn get_pending_books(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let books = BookService::get_pending_books(pool.get_ref()).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": books
    })))
}

/// GET /api/books/my-submissions — O'qituvchi o'zi yuborgan kitoblar
pub async fn get_my_submissions(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["teacher"]) {
        return Ok(resp);
    }

    let books = BookService::get_my_submissions(pool.get_ref(), &claims.sub).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": books
    })))
}

/// PUT /api/books/set-all-active — Admin: barcha kitoblarni faollashtirish/nofaollashtirish
pub async fn set_all_active(
    pool: web::Data<PgPool>,
    claims: Claims,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let active = body.get("active").and_then(|v| v.as_bool()).unwrap_or(true);
    let count = BookService::set_all_active(pool.get_ref(), active).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "affected": count,
        "message": if active { "Barcha kitoblar faollashtirildi" } else { "Barcha kitoblar nofaollashtirildi" }
    })))
}

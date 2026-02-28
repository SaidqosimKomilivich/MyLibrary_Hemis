use actix_web::{web, HttpResponse};
use sqlx::PgPool;

use crate::dto::news::{CreateNewsRequest, NewsListParams, UpdateNewsRequest};
use crate::errors::AppError;
use crate::middleware::auth_middleware::{self, Claims};
use crate::services::news_service::NewsService;

// ─────────────────────────────────────────────────────────────
// PUBLIC endpoints (no auth required)
// ─────────────────────────────────────────────────────────────

/// GET /api/public/news  — nashr qilingan yangiliklar (paginatsiyali)
pub async fn list_public_news(
    pool: web::Data<PgPool>,
    query: web::Query<NewsListParams>,
) -> Result<HttpResponse, AppError> {
    let mut params = query.into_inner();
    params.published_only = Some(true); // Public endpoint — faqat published

    let response = NewsService::list(pool.get_ref(), params).await?;
    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/public/news/{id_or_slug}  — bitta yangilik (slug yoki UUID)
pub async fn get_public_news(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id_or_slug = path.into_inner();
    let news = NewsService::get_by_id_or_slug(pool.get_ref(), &id_or_slug).await?;

    // Public endpointda faqat nashr qilinganlar ko'rinadi
    if !news.is_published {
        return Err(AppError::NotFound("Yangilik topilmadi".to_string()));
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": crate::dto::news::NewsResponse::from(news)
    })))
}

// ─────────────────────────────────────────────────────────────
// ADMIN endpoints (admin JWT required)
// ─────────────────────────────────────────────────────────────

/// GET /api/news  — barcha yangiliklar (admin: published + draft)
pub async fn list_news(
    pool: web::Data<PgPool>,
    claims: Claims,
    query: web::Query<NewsListParams>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let response = NewsService::list(pool.get_ref(), query.into_inner()).await?;
    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/news/{id_or_slug}  — admin: bitta yangilik (har qanday holatda)
pub async fn get_news(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let id_or_slug = path.into_inner();
    let news = NewsService::get_by_id_or_slug(pool.get_ref(), &id_or_slug).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": crate::dto::news::NewsResponse::from(news)
    })))
}

/// POST /api/news  — yangi yangilik yaratish (admin only)
pub async fn create_news(
    pool: web::Data<PgPool>,
    claims: Claims,
    body: web::Json<CreateNewsRequest>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let author_id = uuid::Uuid::parse_str(&claims.sub).ok();
    let news = NewsService::create(pool.get_ref(), body.into_inner(), author_id).await?;

    tracing::info!(news_id = %news.id, slug = %news.slug, "Yangilik yaratildi");

    Ok(HttpResponse::Created().json(serde_json::json!({
        "success": true,
        "message": "Yangilik muvaffaqiyatli yaratildi",
        "data": crate::dto::news::NewsResponse::from(news)
    })))
}

/// PUT /api/news/{id}  — yangilikni yangilash (admin only)
pub async fn update_news(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<uuid::Uuid>,
    body: web::Json<UpdateNewsRequest>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let id = path.into_inner();
    let news = NewsService::update(pool.get_ref(), id, body.into_inner()).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Yangilik muvaffaqiyatli yangilandi",
        "data": crate::dto::news::NewsResponse::from(news)
    })))
}

/// PUT /api/news/{id}/publish  — nashr holatini almashtirish (admin only)
pub async fn toggle_publish(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<uuid::Uuid>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let id = path.into_inner();
    let news = NewsService::toggle_publish(pool.get_ref(), id).await?;
    let status = if news.is_published { "nashr qilindi" } else { "qoralama qilindi" };

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": format!("Yangilik {}", status),
        "data": crate::dto::news::NewsResponse::from(news)
    })))
}

/// DELETE /api/news/{id}  — yangilikni o'chirish (admin only)
pub async fn delete_news(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<uuid::Uuid>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let id = path.into_inner();
    NewsService::delete(pool.get_ref(), id).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Yangilik muvaffaqiyatli o'chirildi"
    })))
}

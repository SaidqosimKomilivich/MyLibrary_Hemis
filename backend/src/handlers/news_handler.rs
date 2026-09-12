use actix_web::{web, HttpResponse};
use sqlx::PgPool;

use crate::dto::news::{
    AttachmentResponse, CreateNewsRequest, NewsListParams, PaginatedPublicNewsResponse,
    PublicNewsResponse, UpdateNewsRequest,
};
use crate::errors::AppError;
use crate::middleware::auth_middleware::{self, Claims};
use crate::models::announcement::AnnouncementWithStatus;
use crate::repository::announcement_repository::AnnouncementRepository;
use crate::repository::news_repository::NewsRepository;
use crate::services::message_service::MessageService;
use crate::services::news_service::NewsService;

// ─────────────────────────────────────────────────────────────
// PUBLIC endpoints (no auth required)
// ─────────────────────────────────────────────────────────────

/// GET /api/public/news  — nashr qilingan yangiliklar (paginatsiyali)
/// Xavfsizlik: author_id oshkor qilinmaydi (PublicNewsResponse)
pub async fn list_public_news(
    pool: web::Data<PgPool>,
    query: web::Query<NewsListParams>,
) -> Result<HttpResponse, AppError> {
    let mut params = query.into_inner();
    params.published_only = Some(true); // Public endpoint — faqat published

    let response = NewsService::list(pool.get_ref(), params).await?;

    // PublicNewsResponse ishlatamiz — author_id yo'q
    let public_data: Vec<PublicNewsResponse> = response
        .data
        .into_iter()
        .map(|n| PublicNewsResponse {
            id: n.id,
            title: n.title,
            slug: n.slug,
            summary: n.summary,
            content: n.content,
            images: n.images,
            category: n.category,
            tags: n.tags,
            is_published: n.is_published,
            published_at: n.published_at,
            views: n.views,
            is_pinned: n.is_pinned,
            attachments: vec![],
            created_at: n.created_at,
            updated_at: n.updated_at,
        })
        .collect();

    Ok(HttpResponse::Ok().json(PaginatedPublicNewsResponse {
        success: true,
        data: public_data,
        pagination: response.pagination,
    }))
}

/// GET /api/public/news/{id_or_slug}  — bitta yangilik (slug yoki UUID)
/// Xavfsizlik: author_id oshkor qilinmaydi
pub async fn get_public_news(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id_or_slug = path.into_inner();
    let news = NewsService::get_by_id_or_slug(pool.get_ref(), &id_or_slug, true).await?;

    // Public endpointda faqat nashr qilinganlar ko'rinadi
    if !news.is_published {
        return Err(AppError::NotFound("Yangilik topilmadi".to_string()));
    }

    let attachments = NewsRepository::find_attachments(pool.get_ref(), news.id).await?;
    let att_responses: Vec<AttachmentResponse> = attachments
        .into_iter()
        .map(|a| AttachmentResponse {
            id: a.id,
            file_url: a.file_url,
            file_name: a.file_name,
            file_size: a.file_size,
            file_type: a.file_type,
        })
        .collect();

    let mut response = PublicNewsResponse::from(news);
    response.attachments = att_responses;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": response
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
    let news = NewsService::get_by_id_or_slug(pool.get_ref(), &id_or_slug, false).await?;

    let attachments = NewsRepository::find_attachments(pool.get_ref(), news.id).await?;
    let att_responses: Vec<AttachmentResponse> = attachments
        .into_iter()
        .map(|a| AttachmentResponse {
            id: a.id,
            file_url: a.file_url,
            file_name: a.file_name,
            file_size: a.file_size,
            file_type: a.file_type,
        })
        .collect();

    let mut response = crate::dto::news::NewsResponse::from(news);
    response.attachments = att_responses;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": response
    })))
}

/// POST /api/news  — yangi yangilik yaratish (admin only)
pub async fn create_news(
    pool: web::Data<PgPool>,
    claims: Claims,
    body: web::Json<CreateNewsRequest>,
    message_service: web::Data<std::sync::Arc<MessageService>>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let author_id = uuid::Uuid::parse_str(&claims.sub).ok();
    let news = NewsService::create(pool.get_ref(), body.into_inner(), author_id).await?;

    // Yangilik darhol nashr qilingan bo'lsa — guruhli e'lon yaratish
    if news.is_published {
        if let Ok(announcement) = AnnouncementRepository::create(
            pool.get_ref(),
            author_id,
            &news.title,
            &news.content,
            news.category.clone(),
            Some(news.images.clone()),
        )
        .await
        {
            // Real-time broadcast
            message_service.broadcast_announcement(AnnouncementWithStatus {
                id: announcement.id,
                sender_id: announcement.sender_id,
                sender_name: None,
                title: announcement.title,
                message: announcement.message,
                category: announcement.category,
                images: announcement.images,
                is_read: false,
                created_at: announcement.created_at,
            });
        }
    }

    tracing::info!(news_id = %news.id, slug = %news.slug, "Yangilik yaratildi");

    let attachments = NewsRepository::find_attachments(pool.get_ref(), news.id).await?;
    let mut response = crate::dto::news::NewsResponse::from(news);
    response.attachments = attachments
        .into_iter()
        .map(|a| AttachmentResponse {
            id: a.id,
            file_url: a.file_url,
            file_name: a.file_name,
            file_size: a.file_size,
            file_type: a.file_type,
        })
        .collect();

    Ok(HttpResponse::Created().json(serde_json::json!({
        "success": true,
        "message": "Yangilik muvaffaqiyatli yaratildi",
        "data": response
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

    let attachments = NewsRepository::find_attachments(pool.get_ref(), news.id).await?;
    let mut response = crate::dto::news::NewsResponse::from(news);
    response.attachments = attachments
        .into_iter()
        .map(|a| AttachmentResponse {
            id: a.id,
            file_url: a.file_url,
            file_name: a.file_name,
            file_size: a.file_size,
            file_type: a.file_type,
        })
        .collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Yangilik muvaffaqiyatli yangilandi",
        "data": response
    })))
}

/// PUT /api/news/{id}/publish  — nashr holatini almashtirish (admin only)
pub async fn toggle_publish(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<uuid::Uuid>,
    message_service: web::Data<std::sync::Arc<MessageService>>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let id = path.into_inner();
    let news = NewsService::toggle_publish(pool.get_ref(), id).await?;
    let status = if news.is_published {
        "nashr qilindi"
    } else {
        "qoralama qilindi"
    };

    // Agar hozir nashr qilingan bo'lsa — guruhli e'lon yaratish
    if news.is_published {
        let author_id = uuid::Uuid::parse_str(&claims.sub).ok();

        if let Ok(announcement) = AnnouncementRepository::create(
            pool.get_ref(),
            author_id,
            &news.title,
            &news.content,
            news.category.clone(),
            Some(news.images.clone()),
        )
        .await
        {
            message_service.broadcast_announcement(AnnouncementWithStatus {
                id: announcement.id,
                sender_id: announcement.sender_id,
                sender_name: None,
                title: announcement.title,
                message: announcement.message,
                category: announcement.category,
                images: announcement.images,
                is_read: false,
                created_at: announcement.created_at,
            });
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": format!("Yangilik {}", status),
        "data": crate::dto::news::NewsResponse::from(news)
    })))
}

/// PUT /api/news/{id}/pin — qadab qo'yish holatini almashtirish (admin only)
pub async fn toggle_pin(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<uuid::Uuid>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let id = path.into_inner();
    let news = NewsService::toggle_pin(pool.get_ref(), id).await?;
    let status = if news.is_pinned {
        "qadab qo'yildi"
    } else {
        "qadab qo'yishdan chiqarildi"
    };

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

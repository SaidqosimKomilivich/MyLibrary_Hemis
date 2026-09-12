use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ─────────────────────────────────────────────────────────────
// Request DTOs
// ─────────────────────────────────────────────────────────────

/// Hujjat biriktirish uchun input ma'lumotlari
#[derive(Debug, Clone, Deserialize)]
pub struct AttachmentInput {
    pub file_url: String,
    pub file_name: String,
    pub file_size: i64,
    pub file_type: String,
}

/// POST /api/news — yangilik yaratish
#[derive(Debug, Deserialize)]
pub struct CreateNewsRequest {
    pub title: String,
    pub summary: Option<String>,
    pub content: String,
    #[serde(default)]
    pub images: Vec<String>,
    pub category: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub is_published: bool,
    #[serde(default)]
    pub is_pinned: bool,
    #[serde(default)]
    pub attachments: Vec<AttachmentInput>,
}

/// PUT /api/news/{id} — yangilikni tahrirlash (barcha maydonlar ixtiyoriy)
#[derive(Debug, Deserialize)]
pub struct UpdateNewsRequest {
    pub title: Option<String>,
    pub summary: Option<String>,
    pub content: Option<String>,
    pub images: Option<Vec<String>>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_published: Option<bool>,
    pub is_pinned: Option<bool>,
    pub attachments: Option<Vec<AttachmentInput>>,
}

/// GET /api/news — ro'yxat so'rovi parametrlari
#[derive(Debug, Deserialize)]
pub struct NewsListParams {
    pub page: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub limit: Option<i64>,
    /// Faqat nashr qilinganlarni qaytarish (public endpoint uchun)
    pub published_only: Option<bool>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub sort_by: Option<String>,
}

// ─────────────────────────────────────────────────────────────
// Response DTOs
// ─────────────────────────────────────────────────────────────

/// Biriktirilgan hujjat javob DTO si
#[derive(Debug, Serialize)]
pub struct AttachmentResponse {
    pub id: Uuid,
    pub file_url: String,
    pub file_name: String,
    pub file_size: i64,
    pub file_type: String,
}

/// Admin uchun yangilik javobi (author_id bilan — faqat autentifikatsiya qilinganlar)
#[derive(Debug, Serialize)]
pub struct NewsResponse {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub summary: Option<String>,
    pub content: String,
    pub images: Vec<String>,
    pub category: Option<String>,
    pub tags: Vec<String>,
    pub author_id: Option<Uuid>,
    pub is_published: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub views: i64,
    pub is_pinned: bool,
    pub attachments: Vec<AttachmentResponse>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<crate::models::news::News> for NewsResponse {
    fn from(n: crate::models::news::News) -> Self {
        NewsResponse {
            id: n.id,
            title: n.title,
            slug: n.slug,
            summary: n.summary,
            content: n.content,
            images: n.images,
            category: n.category,
            tags: n.tags,
            author_id: n.author_id,
            is_published: n.is_published,
            published_at: n.published_at,
            views: n.views,
            is_pinned: n.is_pinned,
            attachments: vec![], // List da bo'sh, detail da handler to'ldiradi
            created_at: n.created_at,
            updated_at: n.updated_at,
        }
    }
}

/// Public yangilik javobi — author_id YO'Q (xavfsizlik)
/// Bu public endpoint'lar uchun ishlatiladi (/api/public/news)
#[derive(Debug, Serialize)]
pub struct PublicNewsResponse {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub summary: Option<String>,
    pub content: String,
    pub images: Vec<String>,
    pub category: Option<String>,
    pub tags: Vec<String>,
    // author_id intentionally omitted for security
    pub is_published: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub views: i64,
    pub is_pinned: bool,
    pub attachments: Vec<AttachmentResponse>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<crate::models::news::News> for PublicNewsResponse {
    fn from(n: crate::models::news::News) -> Self {
        PublicNewsResponse {
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
            attachments: vec![], // List da bo'sh, detail da handler to'ldiradi
            created_at: n.created_at,
            updated_at: n.updated_at,
        }
    }
}

/// Paginatsiyali ro'yxat javobi (admin uchun)
#[derive(Debug, Serialize)]
pub struct PaginatedNewsResponse {
    pub success: bool,
    pub data: Vec<NewsResponse>,
    pub pagination: NewsPagination,
}

/// Paginatsiyali ro'yxat javobi (public uchun — author_id yo'q)
#[derive(Debug, Serialize)]
pub struct PaginatedPublicNewsResponse {
    pub success: bool,
    pub data: Vec<PublicNewsResponse>,
    pub pagination: NewsPagination,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewsPagination {
    pub current_page: i64,
    pub per_page: i64,
    pub total_items: i64,
    pub total_pages: i64,
}

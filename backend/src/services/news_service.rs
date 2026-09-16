use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::news::{
    CreateNewsRequest, NewsListParams, NewsPagination, NewsResponse, PaginatedNewsResponse,
    UpdateNewsRequest,
};
use crate::errors::AppError;
use crate::models::news::News;
use crate::repository::news_repository::NewsRepository;

pub struct NewsService;

impl NewsService {
    // ─────────────────────────────────────────────────────────
    // Slug generation (no external crate)
    // ─────────────────────────────────────────────────────────

    /// Matnni slug formatiga o'tkazadi:
    /// "Hello World! — 2024" → "hello-world-2024"
    fn slugify(text: &str) -> String {
        let mut slug = String::with_capacity(text.len());
        let mut prev_dash = false;

        for ch in text.chars() {
            if ch.is_alphanumeric() {
                slug.push(ch.to_ascii_lowercase());
                prev_dash = false;
            } else if !prev_dash && !slug.is_empty() {
                slug.push('-');
                prev_dash = true;
            }
        }

        // Oxirdagi chiziqchani o'chirish
        if slug.ends_with('-') {
            slug.pop();
        }

        slug
    }

    /// Slug yaratadi va ma'lumotlar bazasida noyobligini tekshiradi.
    /// Agar mavjud bo'lsa, oxiriga qisqa UUID qo'shadi.
    async fn make_unique_slug(pool: &PgPool, title: &str) -> Result<String, AppError> {
        let base = Self::slugify(title);
        if base.is_empty() {
            return Err(AppError::BadRequest(
                "Title slugga o'tkazib bo'lmadi".to_string(),
            ));
        }

        // Birinchi urinish — to'g'ridan-to'g'ri
        if !NewsRepository::slug_exists(pool, &base).await? {
            return Ok(base);
        }

        // Takrorlanish bo'lsa — qisqa UUID qo'shamiz (8 ta belgi)
        for _ in 0..5 {
            let suffix = &Uuid::new_v4().to_string()[..8];
            let candidate = format!("{}-{}", base, suffix);
            if !NewsRepository::slug_exists(pool, &candidate).await? {
                return Ok(candidate);
            }
        }

        Err(AppError::InternalError(
            "Noyob slug yaratib bo'lmadi".to_string(),
        ))
    }

    // ─────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────

    fn validate_create(req: &CreateNewsRequest) -> Result<(), AppError> {
        let title = req.title.trim();
        if title.len() < 3 {
            return Err(AppError::BadRequest(
                "Sarlavha kamida 3 ta belgidan iborat bo'lishi kerak".to_string(),
            ));
        }
        if title.len() > 512 {
            return Err(AppError::BadRequest(
                "Sarlavha 512 ta belgidan oshmasligi kerak".to_string(),
            ));
        }
        let content = req.content.trim();
        if content.len() < 10 {
            return Err(AppError::BadRequest(
                "Mazmun kamida 10 ta belgidan iborat bo'lishi kerak".to_string(),
            ));
        }
        Ok(())
    }

    fn validate_update(req: &UpdateNewsRequest) -> Result<(), AppError> {
        if let Some(title) = &req.title {
            let t = title.trim();
            if t.len() < 3 {
                return Err(AppError::BadRequest(
                    "Sarlavha kamida 3 ta belgidan iborat bo'lishi kerak".to_string(),
                ));
            }
            if t.len() > 512 {
                return Err(AppError::BadRequest(
                    "Sarlavha 512 ta belgidan oshmasligi kerak".to_string(),
                ));
            }
        }
        if let Some(content) = &req.content {
            if content.trim().len() < 10 {
                return Err(AppError::BadRequest(
                    "Mazmun kamida 10 ta belgidan iborat bo'lishi kerak".to_string(),
                ));
            }
        }
        Ok(())
    }

    // ─────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────

    /// HTML kontentni xavfsiz sanitizatsiya qilish (XSS himoyasi)
    /// TinyMCE formatlari, rasmlar va jadvallarni saqlaydi, lekin xavfli skriptlarni tozalaydi
    pub fn sanitize_html(html: &str) -> String {
        let mut builder = ammonia::Builder::default();
        builder
            .add_tags(&[
                "table", "thead", "tbody", "tfoot", "tr", "th", "td",
                "figure", "figcaption", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6",
                "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "strike", "blockquote",
                "ul", "ol", "li", "code", "pre", "a", "img"
            ])
            .add_tag_attributes("img", &["src", "alt", "title", "width", "height", "style", "class", "loading"])
            .add_tag_attributes("table", &["class", "style", "border", "cellpadding", "cellspacing"])
            .add_tag_attributes("td", &["class", "style", "colspan", "rowspan", "align", "valign"])
            .add_tag_attributes("th", &["class", "style", "colspan", "rowspan", "align", "valign"])
            .add_tag_attributes("span", &["class", "style"])
            .add_tag_attributes("div", &["class", "style"])
            .add_tag_attributes("p", &["class", "style", "align"])
            .add_tag_attributes("a", &["href", "title", "target", "rel", "class", "style"]);

        builder.clean(html).to_string()
    }

    /// HTML matndan rasmlarning URL larini avtomatik ajratib olish
    pub fn extract_image_urls(html: &str) -> Vec<String> {
        let mut images = Vec::new();
        let pattern = "<img ";
        let mut cursor = 0;
        while let Some(pos) = html[cursor..].find(pattern) {
            let img_start = cursor + pos + pattern.len();
            if let Some(tag_end) = html[img_start..].find('>') {
                let tag_slice = &html[img_start..img_start + tag_end];
                if let Some(src_pos) = tag_slice.find("src=\"") {
                    let val_start = src_pos + 5;
                    if let Some(val_end) = tag_slice[val_start..].find('"') {
                        let url = tag_slice[val_start..val_start + val_end].to_string();
                        if !url.is_empty() && !images.contains(&url) {
                            images.push(url);
                        }
                    }
                } else if let Some(src_pos) = tag_slice.find("src='") {
                    let val_start = src_pos + 5;
                    if let Some(val_end) = tag_slice[val_start..].find('\'') {
                        let url = tag_slice[val_start..val_start + val_end].to_string();
                        if !url.is_empty() && !images.contains(&url) {
                            images.push(url);
                        }
                    }
                }
                cursor = img_start + tag_end;
            } else {
                break;
            }
        }
        images
    }

    // ─────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────

    /// Yangi yangilik yaratish
    pub async fn create(
        pool: &PgPool,
        mut req: CreateNewsRequest,
        author_id: Option<Uuid>,
    ) -> Result<News, AppError> {
        Self::validate_create(&req)?;

        // HTML sanitizatsiyasi (Backend XSS himoyasi)
        req.content = Self::sanitize_html(&req.content);

        // Agar alohida rasmlar massivi berilmagan bo'lsa, TinyMCE kontentidagi rasmlarni avtomatik saqlash
        if req.images.is_empty() {
            req.images = Self::extract_image_urls(&req.content);
        }

        let slug = Self::make_unique_slug(pool, &req.title).await?;
        let attachments = req.attachments.clone();

        tracing::info!(title = %req.title, slug = %slug, "Yangilik yaratilmoqda");

        let news = NewsRepository::create(pool, &req, &slug, author_id).await?;

        if !attachments.is_empty() {
            NewsRepository::save_attachments(pool, news.id, &attachments).await?;
        }

        Ok(news)
    }

    /// ID yoki slug bo'yicha yangilikni olish
    pub async fn get_by_id_or_slug(
        pool: &PgPool,
        id_or_slug: &str,
        increment_view: bool,
    ) -> Result<News, AppError> {
        let news = if let Ok(id) = Uuid::parse_str(id_or_slug) {
            NewsRepository::find_by_id(pool, id).await?
        } else {
            NewsRepository::find_by_slug(pool, id_or_slug).await?
        };

        if increment_view {
            let pool_clone = pool.clone();
            let news_id = news.id;
            tokio::spawn(async move {
                let _ = NewsRepository::increment_views(&pool_clone, news_id).await;
            });
        }

        Ok(news)
    }

    /// Paginatsiyali ro'yxat
    pub async fn list(
        pool: &PgPool,
        params: NewsListParams,
    ) -> Result<PaginatedNewsResponse, AppError> {
        let page = params.page.unwrap_or(1).max(1);
        let (news, total, per_page) = NewsRepository::list(pool, &params).await?;
        let total_pages = (total + per_page - 1) / per_page;

        let news_ids: Vec<Uuid> = news.iter().map(|n| n.id).collect();
        let all_attachments = NewsRepository::find_attachments_by_news_ids(pool, &news_ids).await.unwrap_or_default();

        use std::collections::HashMap;
        let mut att_map: HashMap<Uuid, Vec<crate::dto::news::AttachmentResponse>> = HashMap::new();
        for att in all_attachments {
            att_map.entry(att.news_id).or_default().push(crate::dto::news::AttachmentResponse {
                id: att.id,
                file_url: att.file_url,
                file_name: att.file_name,
                file_size: att.file_size,
                file_type: att.file_type,
            });
        }

        let data = news.into_iter().map(|n| {
            let n_id = n.id;
            let mut resp = NewsResponse::from(n);
            if let Some(atts) = att_map.remove(&n_id) {
                resp.attachments = atts;
            }
            resp
        }).collect();

        Ok(PaginatedNewsResponse {
            success: true,
            data,
            pagination: NewsPagination {
                current_page: page,
                per_page,
                total_items: total,
                total_pages,
            },
        })
    }

    /// Yangilikni yangilash
    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        mut req: UpdateNewsRequest,
    ) -> Result<News, AppError> {
        Self::validate_update(&req)?;

        // HTML sanitizatsiyasi (agar content yangilansa)
        if let Some(ref content) = req.content {
            let clean_html = Self::sanitize_html(content);
            if req.images.as_ref().map(|imgs| imgs.is_empty()).unwrap_or(true) {
                let extracted = Self::extract_image_urls(&clean_html);
                if !extracted.is_empty() {
                    req.images = Some(extracted);
                }
            }
            req.content = Some(clean_html);
        }

        // Sarlavha o'zgarsa — yangi slug ham generatsiya qilinadi
        let new_slug = if let Some(title) = &req.title {
            Some(Self::make_unique_slug(pool, title).await?)
        } else {
            None
        };

        let news = NewsRepository::update(pool, id, &req, new_slug.as_deref()).await?;

        if let Some(ref attachments) = req.attachments {
            NewsRepository::save_attachments(pool, news.id, attachments).await?;
        }

        Ok(news)
    }

    /// Nashr holatini almashtirish
    pub async fn toggle_publish(pool: &PgPool, id: Uuid) -> Result<News, AppError> {
        NewsRepository::toggle_publish(pool, id).await
    }

    /// Qadab qo'yish holatini almashtirish
    pub async fn toggle_pin(pool: &PgPool, id: Uuid) -> Result<News, AppError> {
        NewsRepository::toggle_pin(pool, id).await
    }

    /// Yangilikni o'chirish
    pub async fn delete(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        NewsRepository::delete(pool, id).await
    }
}

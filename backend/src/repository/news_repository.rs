use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::news::{CreateNewsRequest, NewsListParams, UpdateNewsRequest};
use crate::errors::AppError;
use crate::models::news::News;

const PER_PAGE: i64 = 20;

pub struct NewsRepository;

impl NewsRepository {
    // ─────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────

    pub async fn create(
        pool: &PgPool,
        req: &CreateNewsRequest,
        slug: &str,
        author_id: Option<Uuid>,
    ) -> Result<News, AppError> {
        let published_at = if req.is_published {
            Some(Utc::now())
        } else {
            None
        };

        let news = sqlx::query_as::<_, News>(
            r#"
            INSERT INTO news
                (title, slug, summary, content, images, category, tags,
                 author_id, is_published, published_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(&req.title)
        .bind(slug)
        .bind(&req.summary)
        .bind(&req.content)
        .bind(&req.images)
        .bind(&req.category)
        .bind(&req.tags)
        .bind(author_id)
        .bind(req.is_published)
        .bind(published_at)
        .fetch_one(pool)
        .await?;

        Ok(news)
    }

    // ─────────────────────────────────────────────────────────
    // READ — by UUID
    // ─────────────────────────────────────────────────────────

    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<News, AppError> {
        let news = sqlx::query_as::<_, News>("SELECT * FROM news WHERE id = $1")
            .bind(id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound("Yangilik topilmadi".to_string()))?;

        Ok(news)
    }

    // ─────────────────────────────────────────────────────────
    // READ — by slug
    // ─────────────────────────────────────────────────────────

    pub async fn find_by_slug(pool: &PgPool, slug: &str) -> Result<News, AppError> {
        let news = sqlx::query_as::<_, News>("SELECT * FROM news WHERE slug = $1")
            .bind(slug)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound("Yangilik topilmadi".to_string()))?;

        Ok(news)
    }

    // ─────────────────────────────────────────────────────────
    // READ — paginated list
    // ─────────────────────────────────────────────────────────

    pub async fn list(
        pool: &PgPool,
        params: &NewsListParams,
    ) -> Result<(Vec<News>, i64, i64), AppError> {
        let page = params.page.unwrap_or(1).max(1);
        let per_page = params.limit.unwrap_or(PER_PAGE).max(1).min(100);
        let offset = (page - 1) * per_page;
        let published_only = params.published_only.unwrap_or(false);

        // Build dynamic search pattern
        let search = params
            .search
            .as_deref()
            .map(|s| format!("%{}%", s.to_lowercase()));

        let rows = sqlx::query_as::<_, News>(
            r#"
            SELECT * FROM news
            WHERE
                ($1::BOOLEAN = FALSE OR is_published = TRUE)
                AND ($2::TEXT IS NULL OR LOWER(title) LIKE $2)
                AND ($3::TEXT IS NULL OR category = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(published_only)
        .bind(&search)
        .bind(&params.category)
        .bind(per_page)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM news
            WHERE
                ($1::BOOLEAN = FALSE OR is_published = TRUE)
                AND ($2::TEXT IS NULL OR LOWER(title) LIKE $2)
                AND ($3::TEXT IS NULL OR category = $3)
            "#,
        )
        .bind(published_only)
        .bind(&search)
        .bind(&params.category)
        .fetch_one(pool)
        .await?;

        Ok((rows, total, per_page))
    }

    // ─────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────

    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        req: &UpdateNewsRequest,
        new_slug: Option<&str>,
    ) -> Result<News, AppError> {
        // Fetch existing record first to fill NULL-safe defaults
        let existing = Self::find_by_id(pool, id).await?;

        let title = req.title.as_deref().unwrap_or(&existing.title);
        let slug = new_slug.unwrap_or(&existing.slug);
        let summary = req.summary.as_deref().or(existing.summary.as_deref());
        let content = req.content.as_deref().unwrap_or(&existing.content);
        let images = req.images.as_deref().unwrap_or(&existing.images);
        let category = req.category.as_deref().or(existing.category.as_deref());
        let tags = req.tags.as_deref().unwrap_or(&existing.tags);

        // Handle publish state change
        let is_published = req.is_published.unwrap_or(existing.is_published);
        let published_at = if is_published && !existing.is_published {
            // Newly published
            Some(Utc::now())
        } else if is_published {
            // Already published — keep existing timestamp
            existing.published_at
        } else {
            // Unpublished — clear
            None
        };

        let news = sqlx::query_as::<_, News>(
            r#"
            UPDATE news SET
                title           = $1,
                slug            = $2,
                summary         = $3,
                content         = $4,
                images          = $5,
                category        = $6,
                tags            = $7,
                is_published    = $8,
                published_at    = $9
            WHERE id = $10
            RETURNING *
            "#,
        )
        .bind(title)
        .bind(slug)
        .bind(summary)
        .bind(content)
        .bind(images)
        .bind(category)
        .bind(tags)
        .bind(is_published)
        .bind(published_at)
        .bind(id)
        .fetch_one(pool)
        .await?;

        Ok(news)
    }

    // ─────────────────────────────────────────────────────────
    // TOGGLE PUBLISH
    // ─────────────────────────────────────────────────────────

    pub async fn toggle_publish(pool: &PgPool, id: Uuid) -> Result<News, AppError> {
        let news = sqlx::query_as::<_, News>(
            r#"
            UPDATE news SET
                is_published = NOT is_published,
                published_at = CASE
                    WHEN NOT is_published THEN NOW()
                    ELSE NULL
                END
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Yangilik topilmadi".to_string()))?;

        Ok(news)
    }

    // ─────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────

    pub async fn delete(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query("DELETE FROM news WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Yangilik topilmadi".to_string()));
        }

        Ok(())
    }

    // ─────────────────────────────────────────────────────────
    // SLUG UNIQUENESS CHECK
    // ─────────────────────────────────────────────────────────

    pub async fn slug_exists(pool: &PgPool, slug: &str) -> Result<bool, AppError> {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM news WHERE slug = $1")
                .bind(slug)
                .fetch_one(pool)
                .await?;

        Ok(count > 0)
    }
}

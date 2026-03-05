use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::book::{CreateBookRequest, UpdateBookRequest};
use crate::errors::AppError;
use crate::models::book::Book;

pub struct BookRepository;

impl BookRepository {
    /// Kitoblar sonini olish (paginatsiya uchun)
    pub async fn count(
        pool: &PgPool,
        search: Option<&str>,
        category: Option<&str>,
        include_inactive: bool,
    ) -> Result<i64, AppError> {
        let active_filter = if include_inactive { String::new() } else { r#" AND "is_active" = true"#.to_string() };
        let mut query = format!(r#"SELECT COUNT(*) as "count" FROM "book" WHERE 1=1{}"#, active_filter);
        let mut param_idx = 1u32;

        if search.is_some() {
            query.push_str(&format!(
                r#" AND (LOWER("title") LIKE LOWER(${}::text) OR LOWER("author") LIKE LOWER(${}::text))"#,
                param_idx, param_idx
            ));
            param_idx += 1;
        }
        if category.is_some() {
            query.push_str(&format!(r#" AND "category" = ${}"#, param_idx));
        }

        let mut q = sqlx::query_scalar::<_, i64>(&query);

        if let Some(s) = search {
            q = q.bind(format!("%{}%", s));
        }
        if let Some(c) = category {
            q = q.bind(c.to_string());
        }

        let count = q.fetch_one(pool).await?;
        Ok(count)
    }

    /// Kitoblarni paginatsiya bilan olish
    pub async fn find_all(
        pool: &PgPool,
        page: i64,
        per_page: i64,
        search: Option<&str>,
        category: Option<&str>,
        include_inactive: bool,
    ) -> Result<Vec<Book>, AppError> {
        let offset = (page - 1) * per_page;
        let active_filter = if include_inactive { String::new() } else { r#" AND "is_active" = true"#.to_string() };
        let mut query = format!(r#"SELECT * FROM "book" WHERE 1=1{}"#, active_filter);
        let mut param_idx = 1u32;

        if search.is_some() {
            query.push_str(&format!(
                r#" AND (LOWER("title") LIKE LOWER(${}::text) OR LOWER("author") LIKE LOWER(${}::text))"#,
                param_idx, param_idx
            ));
            param_idx += 1;
        }
        if category.is_some() {
            query.push_str(&format!(r#" AND "category" = ${}"#, param_idx));
            param_idx += 1;
        }

        query.push_str(&format!(
            r#" ORDER BY "created_at" DESC LIMIT ${} OFFSET ${}"#,
            param_idx,
            param_idx + 1
        ));

        let mut q = sqlx::query_as::<_, Book>(&query);

        if let Some(s) = search {
            q = q.bind(format!("%{}%", s));
        }
        if let Some(c) = category {
            q = q.bind(c.to_string());
        }

        q = q.bind(per_page).bind(offset);

        let books = q.fetch_all(pool).await?;
        Ok(books)
    }

    /// is_active = false bo'lgan (kutilayotgan) kitoblar
    pub async fn find_pending(pool: &PgPool) -> Result<Vec<Book>, AppError> {
        let books = sqlx::query_as::<_, Book>(
            r#"SELECT * FROM "book" WHERE "is_active" = false ORDER BY "created_at" DESC"#
        )
        .fetch_all(pool)
        .await?;
        Ok(books)
    }

    /// is_active ni almashtirish (true -> false yoki false -> true) va admin izohini saqlash
    pub async fn toggle_active(pool: &PgPool, id: Uuid, comment: Option<String>) -> Result<Option<Book>, AppError> {
        let book = sqlx::query_as::<_, Book>(
            r#"UPDATE "book" SET "is_active" = NOT "is_active", "admin_comment" = $2 WHERE "id" = $1 RETURNING *"#
        )
        .bind(id)
        .bind(comment)
        .fetch_optional(pool)
        .await?;
        Ok(book)
    }

    /// O'qituvchi taqdim etgan kitobni yaratish (is_active = false, submitted_by saqlanadi)
    pub async fn create_submitted(pool: &PgPool, req: &CreateBookRequest, submitted_by: &str) -> Result<Book, AppError> {
        let book = sqlx::query_as::<_, Book>(
            r#"
            INSERT INTO "book" (
                "title", "author", "subtitle", "translator",
                "isbn_13", "isbn_10", "publisher", "publication_date",
                "edition", "language", "category", "genre",
                "description", "page_count", "duration_seconds", "format",
                "cover_image_url", "digital_file_url", "shelf_location",
                "total_quantity", "available_quantity", "is_active", "submitted_by"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, false, $22
            ) RETURNING *
            "#,
        )
        .bind(&req.title)
        .bind(&req.author)
        .bind(&req.subtitle)
        .bind(&req.translator)
        .bind(&req.isbn_13)
        .bind(&req.isbn_10)
        .bind(&req.publisher)
        .bind(req.publication_date)
        .bind(&req.edition)
        .bind(&req.language)
        .bind(&req.category)
        .bind(&req.genre)
        .bind(&req.description)
        .bind(req.page_count)
        .bind(req.duration_seconds)
        .bind(&req.format)
        .bind(&req.cover_image_url)
        .bind(&req.digital_file_url)
        .bind(&req.shelf_location)
        .bind(req.total_quantity.unwrap_or(1))
        .bind(req.total_quantity.unwrap_or(1))
        .bind(submitted_by)
        .fetch_one(pool)
        .await?;
        Ok(book)
    }

    /// O'qituvchi o'zi yuborgan kitoblarni olish (submitted_by = user_id)
    pub async fn find_by_submitted_by(pool: &PgPool, submitted_by: &str) -> Result<Vec<Book>, AppError> {
        let books = sqlx::query_as::<_, Book>(
            r#"SELECT * FROM "book" WHERE "submitted_by" = $1 ORDER BY "created_at" DESC"#
        )
        .bind(submitted_by)
        .fetch_all(pool)
        .await?;
        Ok(books)
    }

    /// O'qituvchilar tomonidan taqdim etilgan barcha kitoblarni olish
    pub async fn find_all_submitted(pool: &PgPool) -> Result<Vec<Book>, AppError> {
        let books = sqlx::query_as::<_, Book>(
            r#"SELECT * FROM "book" WHERE "submitted_by" IS NOT NULL ORDER BY "created_at" DESC"#
        )
        .fetch_all(pool)
        .await?;
        Ok(books)
    }

    /// Kitobni ID bo'yicha topish
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Book>, AppError> {
        let book = sqlx::query_as::<_, Book>(r#"SELECT * FROM "book" WHERE "id" = $1"#)
            .bind(id)
            .fetch_optional(pool)
            .await?;

        Ok(book)
    }

    /// Yangi kitob yaratish
    pub async fn create(pool: &PgPool, req: &CreateBookRequest, added_by: Uuid) -> Result<Book, AppError> {
        let book = sqlx::query_as::<_, Book>(
            r#"
            INSERT INTO "book" (
                "title", "author", "subtitle", "translator",
                "isbn_13", "isbn_10", "publisher", "publication_date",
                "edition", "language", "category", "genre",
                "description", "page_count", "duration_seconds", "format",
                "cover_image_url", "digital_file_url", "shelf_location",
                "total_quantity", "available_quantity", "added_by"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
            ) RETURNING *
            "#,
        )
        .bind(&req.title)
        .bind(&req.author)
        .bind(&req.subtitle)
        .bind(&req.translator)
        .bind(&req.isbn_13)
        .bind(&req.isbn_10)
        .bind(&req.publisher)
        .bind(req.publication_date)
        .bind(&req.edition)
        .bind(&req.language)
        .bind(&req.category)
        .bind(&req.genre)
        .bind(&req.description)
        .bind(req.page_count)
        .bind(req.duration_seconds)
        .bind(&req.format)
        .bind(&req.cover_image_url)
        .bind(&req.digital_file_url)
        .bind(&req.shelf_location)
        .bind(req.total_quantity)
        .bind(req.available_quantity)
        .bind(added_by)
        .fetch_one(pool)
        .await?;

        Ok(book)
    }

    /// Kitobni yangilash (faqat berilgan maydonlar)
    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        req: &UpdateBookRequest,
    ) -> Result<Option<Book>, AppError> {
        let book = sqlx::query_as::<_, Book>(
            r#"
            UPDATE "book" SET
                "title" = COALESCE($2, "title"),
                "author" = COALESCE($3, "author"),
                "subtitle" = COALESCE($4, "subtitle"),
                "translator" = COALESCE($5, "translator"),
                "isbn_13" = COALESCE($6, "isbn_13"),
                "isbn_10" = COALESCE($7, "isbn_10"),
                "publisher" = COALESCE($8, "publisher"),
                "publication_date" = COALESCE($9, "publication_date"),
                "edition" = COALESCE($10, "edition"),
                "language" = COALESCE($11, "language"),
                "category" = COALESCE($12, "category"),
                "genre" = COALESCE($13, "genre"),
                "description" = COALESCE($14, "description"),
                "page_count" = COALESCE($15, "page_count"),
                "duration_seconds" = COALESCE($16, "duration_seconds"),
                "format" = COALESCE($17, "format"),
                "cover_image_url" = COALESCE($18, "cover_image_url"),
                "digital_file_url" = COALESCE($19, "digital_file_url"),
                "shelf_location" = COALESCE($20, "shelf_location"),
                "total_quantity" = COALESCE($21, "total_quantity"),
                "available_quantity" = COALESCE($22, "available_quantity")
            WHERE "id" = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.title)
        .bind(&req.author)
        .bind(&req.subtitle)
        .bind(&req.translator)
        .bind(&req.isbn_13)
        .bind(&req.isbn_10)
        .bind(&req.publisher)
        .bind(req.publication_date)
        .bind(&req.edition)
        .bind(&req.language)
        .bind(&req.category)
        .bind(&req.genre)
        .bind(&req.description)
        .bind(req.page_count)
        .bind(req.duration_seconds)
        .bind(&req.format)
        .bind(&req.cover_image_url)
        .bind(&req.digital_file_url)
        .bind(&req.shelf_location)
        .bind(req.total_quantity)
        .bind(req.available_quantity)
        .fetch_optional(pool)
        .await?;

        Ok(book)
    }

    /// Kitobni o'chirish (soft delete — is_active = false)
    pub async fn soft_delete(pool: &PgPool, id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query(
            r#"UPDATE "book" SET "is_active" = false WHERE "id" = $1 AND "is_active" = true"#,
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Barcha kitoblarni bir vaqtda faollashtirish yoki nofaollashtirish
    pub async fn set_all_active(pool: &PgPool, active: bool) -> Result<u64, AppError> {
        let result = sqlx::query(r#"UPDATE "book" SET "is_active" = $1"#)
            .bind(active)
            .execute(pool)
            .await?;
        Ok(result.rows_affected())
    }
}

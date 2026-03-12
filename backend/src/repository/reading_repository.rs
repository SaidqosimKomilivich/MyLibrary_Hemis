use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::reading::ReadingResponse;
use crate::errors::AppError;

/// Raw SQL query result for reading + book JOIN
#[derive(Debug, sqlx::FromRow)]
pub struct ReadingWithBook {
    pub id: Uuid,
    pub user_id: String,
    pub book_id: String,
    pub start: Option<chrono::NaiveDateTime>,
    pub finish: Option<chrono::NaiveDateTime>,
    pub book_type: Option<String>,
    pub audio: Option<i32>,
    pub page: Option<i32>,
    pub state: Option<bool>,
    // From books table
    pub book_title: Option<String>,
    pub book_author: Option<String>,
    pub book_cover: Option<String>,
    pub book_category: Option<String>,
    pub book_page_count: Option<i32>,
    pub book_format: Option<String>,
    pub book_digital_file_url: Option<String>,
}

pub struct ReadingRepository;

impl ReadingRepository {
    /// Kitob o'qishni boshlash
    pub async fn create(
        pool: &PgPool,
        user_id: &str,
        book_id: &str,
        book_type: Option<&str>,
        page: Option<i32>,
        audio: Option<i32>,
    ) -> Result<Uuid, AppError> {
        let row: (Uuid,) = sqlx::query_as(
            r#"INSERT INTO "reading" ("user_id", "book_id", "book_type", "page", "audio")
               VALUES ($1, $2, $3, $4, $5)
               RETURNING "id""#,
        )
        .bind(user_id)
        .bind(book_id)
        .bind(book_type)
        .bind(page)
        .bind(audio)
        .fetch_one(pool)
        .await?;

        Ok(row.0)
    }

    /// Foydalanuvchi o'qiyotgan kitoblarni olish (kitob ma'lumotlari bilan)
    pub async fn find_by_user_id(
        pool: &PgPool,
        user_id: &str,
    ) -> Result<Vec<ReadingWithBook>, AppError> {
        let readings = sqlx::query_as::<_, ReadingWithBook>(
            r#"SELECT 
                r."id", r."user_id", r."book_id", r."start", r."finish",
                r."book_type", r."audio", r."page", r."state",
                b."title" as book_title,
                b."author" as book_author,
                b."cover_image_url" as book_cover,
                b."category" as book_category,
                b."page_count" as book_page_count,
                b."format" as book_format,
                b."digital_file_url" as book_digital_file_url
            FROM "reading" r
            LEFT JOIN "book" b ON b."id"::text = r."book_id"
            WHERE r."user_id" = $1
            ORDER BY r."start" DESC"#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(readings)
    }

    /// Tekshirish: bu kitob allaqachon o'qilayotganmi?
    pub async fn exists(pool: &PgPool, user_id: &str, book_id: &str) -> Result<bool, AppError> {
        let row: (i64,) = sqlx::query_as(
            r#"SELECT COUNT(*) FROM "reading" WHERE "user_id" = $1 AND "book_id" = $2"#,
        )
        .bind(user_id)
        .bind(book_id)
        .fetch_one(pool)
        .await?;

        Ok(row.0 > 0)
    }

    /// O'qishni o'chirish
    pub async fn delete(pool: &PgPool, id: Uuid, user_id: &str) -> Result<bool, AppError> {
        let result = sqlx::query(r#"DELETE FROM "reading" WHERE "id" = $1 AND "user_id" = $2"#)
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

impl ReadingWithBook {
    pub fn into_response(self) -> ReadingResponse {
        ReadingResponse {
            id: self.id,
            user_id: self.user_id,
            book_id: self.book_id,
            start: self.start.map(|d| format!("{}Z", d.format("%Y-%m-%dT%H:%M:%S"))),
            finish: self.finish.map(|d| format!("{}Z", d.format("%Y-%m-%dT%H:%M:%S"))),
            book_type: self.book_type,
            audio: self.audio,
            page: self.page,
            state: self.state,
            book_title: self.book_title,
            book_author: self.book_author,
            book_cover: self.book_cover,
            book_category: self.book_category,
            book_page_count: self.book_page_count,
            book_format: self.book_format,
            book_digital_file_url: self.book_digital_file_url,
        }
    }
}

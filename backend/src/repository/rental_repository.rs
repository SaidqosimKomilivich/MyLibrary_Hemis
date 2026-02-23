use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::rental::RentalResponse;
use crate::errors::AppError;

/// JOIN natijasi — ijara + kitob + foydalanuvchi ma'lumotlari
#[derive(Debug, sqlx::FromRow)]
pub struct RentalWithDetails {
    pub id: Uuid,
    pub user_id: String,
    pub book_id: String,
    pub loan_date: NaiveDate,
    pub due_date: NaiveDate,
    pub return_date: Option<NaiveDate>,
    pub status: crate::models::rental::RentalStatus,
    pub notes: Option<String>,
    // Kitob ma'lumotlari
    pub book_title: Option<String>,
    pub book_author: Option<String>,
    pub book_cover: Option<String>,
    // Foydalanuvchi ma'lumotlari
    pub user_full_name: Option<String>,
    pub role: Option<String>,
    pub department_name: Option<String>,
    pub group_name: Option<String>,
    pub staff_position: Option<String>,
}

impl RentalWithDetails {
    pub fn into_response(self) -> RentalResponse {
        RentalResponse {
            id: self.id,
            user_id: self.user_id,
            book_id: self.book_id,
            loan_date: self.loan_date.format("%Y-%m-%d").to_string(),
            due_date: self.due_date.format("%Y-%m-%d").to_string(),
            return_date: self.return_date.map(|d| d.format("%Y-%m-%d").to_string()),
            status: self.status.to_string(),
            notes: self.notes,
            book_title: self.book_title,
            book_author: self.book_author,
            book_cover: self.book_cover,
            user_full_name: self.user_full_name,
            role: self.role,
            department_name: self.department_name,
            group_name: self.group_name,
            staff_position: self.staff_position,
        }
    }
}

pub struct RentalRepository;

impl RentalRepository {
    /// Yangi ijara yaratish
    pub async fn create(
        pool: &PgPool,
        user_id: &str,
        book_id: &str,
        due_date: NaiveDate,
        notes: Option<&str>,
    ) -> Result<Uuid, AppError> {
        let row: (Uuid,) = sqlx::query_as(
            r#"INSERT INTO "book_rentals" ("user_id", "book_id", "due_date", "notes")
               VALUES ($1, $2, $3, $4)
               RETURNING "id""#,
        )
        .bind(user_id)
        .bind(book_id)
        .bind(due_date)
        .bind(notes)
        .fetch_one(pool)
        .await?;

        Ok(row.0)
    }

    /// Kitobni qaytarish
    pub async fn return_book(
        pool: &PgPool,
        id: Uuid,
        notes: Option<&str>,
    ) -> Result<bool, AppError> {
        let result = sqlx::query(
            r#"UPDATE "book_rentals"
               SET "status" = 'returned',
                   "return_date" = CURRENT_DATE,
                   "notes" = COALESCE($2, "notes")
               WHERE "id" = $1 AND "status" = 'active'"#,
        )
        .bind(id)
        .bind(notes)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Aktiv ijara borligini tekshirish (dublikat oldini olish)
    pub async fn find_active_by_user_and_book(
        pool: &PgPool,
        user_id: &str,
        book_id: &str,
    ) -> Result<bool, AppError> {
        let row: (i64,) = sqlx::query_as(
            r#"SELECT COUNT(*) FROM "book_rentals"
               WHERE "user_id" = $1 AND "book_id" = $2 AND "status" = 'active'"#,
        )
        .bind(user_id)
        .bind(book_id)
        .fetch_one(pool)
        .await?;

        Ok(row.0 > 0)
    }

    /// Bitta ijarani topish (kitob va foydalanuvchi bilan)
    pub async fn find_by_id(
        pool: &PgPool,
        id: Uuid,
    ) -> Result<Option<RentalWithDetails>, AppError> {
        let record = sqlx::query_as::<_, RentalWithDetails>(
            r#"SELECT
                r."id", r."user_id", r."book_id",
                r."loan_date", r."due_date", r."return_date",
                r."status", r."notes",
                b."title" as book_title,
                b."author" as book_author,
                b."cover_image_url" as book_cover,
                u."full_name" as user_full_name,
                u."role" as role,
                u."department_name" as department_name,
                u."group_name" as group_name,
                u."staff_position" as staff_position
            FROM "book_rentals" r
            LEFT JOIN "book" b ON b."id"::text = r."book_id"
            LEFT JOIN "users" u ON u."user_id" = r."user_id"
            WHERE r."id" = $1"#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(record)
    }

    /// Barcha ijaralar (filtr bilan)
    pub async fn find_all(
        pool: &PgPool,
        status: Option<&str>,
        user_id: Option<&str>,
    ) -> Result<Vec<RentalWithDetails>, AppError> {
        let mut query = String::from(
            r#"SELECT
                r."id", r."user_id", r."book_id",
                r."loan_date", r."due_date", r."return_date",
                r."status", r."notes",
                b."title" as book_title,
                b."author" as book_author,
                b."cover_image_url" as book_cover,
                u."full_name" as user_full_name,
                u."role" as role,
                u."department_name" as department_name,
                u."group_name" as group_name,
                u."staff_position" as staff_position
            FROM "book_rentals" r
            LEFT JOIN "book" b ON b."id"::text = r."book_id"
            LEFT JOIN "users" u ON u."user_id" = r."user_id"
            WHERE 1=1"#,
        );

        let mut param_idx = 1u32;

        if status.is_some() {
            query.push_str(&format!(
                r#" AND r."status" = ${}::rental_status_type"#,
                param_idx
            ));
            param_idx += 1;
        }

        if user_id.is_some() {
            query.push_str(&format!(r#" AND r."user_id" = ${}"#, param_idx));
        }

        query.push_str(r#" ORDER BY r."loan_date" DESC"#);

        let mut q = sqlx::query_as::<_, RentalWithDetails>(&query);

        if let Some(s) = status {
            q = q.bind(s.to_string());
        }
        if let Some(u) = user_id {
            q = q.bind(u.to_string());
        }

        let records = q.fetch_all(pool).await?;
        Ok(records)
    }

    /// Kitobning available_quantity ni kamaytirish
    pub async fn decrement_book_quantity(pool: &PgPool, book_id: &str) -> Result<bool, AppError> {
        let result = sqlx::query(
            r#"UPDATE "book"
               SET "available_quantity" = "available_quantity" - 1
               WHERE "id"::text = $1 AND "available_quantity" > 0"#,
        )
        .bind(book_id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Kitobning available_quantity ni oshirish
    pub async fn increment_book_quantity(pool: &PgPool, book_id: &str) -> Result<(), AppError> {
        sqlx::query(
            r#"UPDATE "book"
               SET "available_quantity" = "available_quantity" + 1
               WHERE "id"::text = $1"#,
        )
        .bind(book_id)
        .execute(pool)
        .await?;

        Ok(())
    }
}

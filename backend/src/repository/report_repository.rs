use chrono::NaiveDate;
use sqlx::PgPool;

use crate::dto::control::ControlResponse;
use crate::dto::rental::RentalResponse;
use crate::errors::AppError;

pub struct ReportRepository;

#[derive(Debug, sqlx::FromRow)]
pub struct ControlWithDetails {
    pub id: uuid::Uuid,
    pub user_id: String,
    pub arrival: Option<chrono::NaiveDateTime>,
    pub departure: Option<chrono::NaiveDateTime>,
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub department_name: Option<String>,
    pub group_name: Option<String>,
    pub staff_position: Option<String>,
}

impl ReportRepository {
    /// Oxirgi N ta ijara ma'lumotlarini olish usuli
    pub async fn get_recent_rentals(pool: &PgPool, limit: i64) -> Result<Vec<RentalResponse>, AppError> {
        let records = sqlx::query_as!(
            crate::repository::rental_repository::RentalWithDetails,
            r#"SELECT
                r."id", r."user_id", r."book_id",
                r."loan_date", r."due_date", r."return_date",
                r."status" as "status: crate::models::rental::RentalStatus", r."notes",
                b."title" as "book_title?",
                b."author" as "book_author?",
                b."cover_image_url" as "book_cover?",
                u."full_name" as "user_full_name?",
                u."role" as "role?",
                u."department_name" as "department_name?",
                u."group_name" as "group_name?",
                u."staff_position" as "staff_position?"
            FROM "book_rentals" r
            LEFT JOIN "book" b ON b."id"::text = r."book_id"
            LEFT JOIN "users" u ON u."user_id" = r."user_id"
            ORDER BY r."loan_date" DESC
            LIMIT $1"#,
            limit
        )
        .fetch_all(pool)
        .await?;

        Ok(records.into_iter().map(|r| r.into_response()).collect())
    }

    /// Oxirgi N ta keldi-ketdi ma'lumotlarini olish usuli
    pub async fn get_recent_controls(pool: &PgPool, limit: i64) -> Result<Vec<ControlResponse>, AppError> {
        let records = sqlx::query_as!(
            ControlWithDetails,
            r#"SELECT 
                c."id", c."user_id", c."arrival", c."departure",
                u."full_name" as "full_name?",
                u."role" as "role?",
                u."department_name" as "department_name?",
                u."group_name" as "group_name?",
                u."staff_position" as "staff_position?"
            FROM "control" c
            LEFT JOIN "users" u ON u."user_id" = c."user_id"
            ORDER BY c."arrival" DESC
            LIMIT $1"#,
            limit
        )
        .fetch_all(pool)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| ControlResponse {
                id: r.id,
                user_id: r.user_id,
                arrival: r.arrival.map(|t| t.to_string()),
                departure: r.departure.map(|t| t.to_string()),
                full_name: r.full_name,
                role: r.role,
                department_name: r.department_name,
                group_name: r.group_name,
                staff_position: r.staff_position,
            })
            .collect())
    }

    /// Belgilangan sanalar oralig'idagi ijaralarni olish Excel uchun
    pub async fn get_rentals_by_date(
        pool: &PgPool,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<RentalResponse>, AppError> {
        let records = sqlx::query_as!(
            crate::repository::rental_repository::RentalWithDetails,
            r#"SELECT
                r."id", r."user_id", r."book_id",
                r."loan_date", r."due_date", r."return_date",
                r."status" as "status: crate::models::rental::RentalStatus", r."notes",
                b."title" as "book_title?",
                b."author" as "book_author?",
                b."cover_image_url" as "book_cover?",
                u."full_name" as "user_full_name?",
                u."role" as "role?",
                u."department_name" as "department_name?",
                u."group_name" as "group_name?",
                u."staff_position" as "staff_position?"
            FROM "book_rentals" r
            LEFT JOIN "book" b ON b."id"::text = r."book_id"
            LEFT JOIN "users" u ON u."user_id" = r."user_id"
            WHERE r."loan_date" >= $1 AND r."loan_date" <= $2
            ORDER BY r."loan_date" DESC"#,
            start_date,
            end_date
        )
        .fetch_all(pool)
        .await?;

        Ok(records.into_iter().map(|r| r.into_response()).collect())
    }

    /// Belgilangan sanalar oralig'idagi o'qituvchilar taqdim qilgan kitoblarni olish
    pub async fn get_submissions_by_date(
        pool: &PgPool,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<crate::dto::report::SubmittedBookReportResponse>, AppError> {
        let records = sqlx::query!(
            r#"SELECT 
                b."id", 
                b."title", 
                b."author", 
                b."is_active", 
                b."admin_comment", 
                b."created_at",
                u."full_name" as "teacher_name?"
            FROM "book" b
            LEFT JOIN "users" u ON u."id"::text = b."submitted_by"
            WHERE b."submitted_by" IS NOT NULL
              AND DATE(b."created_at") >= $1 
              AND DATE(b."created_at") <= $2
            ORDER BY b."created_at" DESC"#,
            start_date,
            end_date
        )
        .fetch_all(pool)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| crate::dto::report::SubmittedBookReportResponse {
                id: r.id,
                title: r.title,
                author: r.author,
                status: if r.is_active.unwrap_or(false) { "Faol".to_string() } else { "Kutilmoqda".to_string() },
                admin_comment: r.admin_comment,
                submitted_at: r.created_at.format("%Y-%m-%d %H:%M:%S").to_string(),
                teacher_full_name: r.teacher_name,
            })
            .collect())
    }

    /// Belgilangan sanalar oralig'idagi keldi-ketdilarni olish Excel uchun
    pub async fn get_controls_by_date(
        pool: &PgPool,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<ControlResponse>, AppError> {
        let records = sqlx::query_as!(
            ControlWithDetails,
            r#"SELECT 
                c."id", c."user_id", c."arrival", c."departure",
                u."full_name" as "full_name?",
                u."role" as "role?",
                u."department_name" as "department_name?",
                u."group_name" as "group_name?",
                u."staff_position" as "staff_position?"
            FROM "control" c
            LEFT JOIN "users" u ON u."user_id" = c."user_id"
            WHERE DATE(c."arrival") >= $1 AND DATE(c."arrival") <= $2
            ORDER BY c."arrival" DESC"#,
            start_date,
            end_date
        )
        .fetch_all(pool)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| ControlResponse {
                id: r.id,
                user_id: r.user_id,
                arrival: r.arrival.map(|t| t.to_string()),
                departure: r.departure.map(|t| t.to_string()),
                full_name: r.full_name,
                role: r.role,
                department_name: r.department_name,
                group_name: r.group_name,
                staff_position: r.staff_position,
            })
            .collect())
    }
}

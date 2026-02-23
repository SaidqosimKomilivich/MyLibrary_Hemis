use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::control::Control;

#[derive(Debug, sqlx::FromRow)]
pub struct ControlWithUser {
    pub id: Uuid,
    pub user_id: String,
    pub arrival: Option<chrono::NaiveDateTime>,
    pub departure: Option<chrono::NaiveDateTime>,
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub department_name: Option<String>,
    pub group_name: Option<String>,
    pub staff_position: Option<String>,
}

pub struct ControlRepository;

impl ControlRepository {
    /// Foydalanuvchi kelganini qayd etish (yangi yozuv yaratish)
    pub async fn arrive(pool: &PgPool, user_id: &str) -> Result<Control, AppError> {
        let record = sqlx::query_as::<_, Control>(
            r#"INSERT INTO "control" ("user_id")
               VALUES ($1)
               RETURNING "id", "user_id", "arrival", "departure""#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        Ok(record)
    }

    /// Foydalanuvchining aktiv sessiyasini topish (hali ketmagan)
    /// departure NULL yoki arrival = departure bo'lgan
    pub async fn find_active_by_user_id(
        pool: &PgPool,
        user_id: &str,
    ) -> Result<Option<Control>, AppError> {
        let record = sqlx::query_as::<_, Control>(
            r#"SELECT "id", "user_id", "arrival", "departure"
               FROM "control"
               WHERE "user_id" = $1
                 AND ("departure" IS NULL OR "arrival" = "departure")
                 AND "arrival"::date = CURRENT_DATE
               ORDER BY "arrival" DESC
               LIMIT 1"#,
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(record)
    }

    /// Foydalanuvchi ketganini qayd etish (departure yangilanadi trigger orqali)
    pub async fn depart(pool: &PgPool, id: Uuid, user_id: &str) -> Result<bool, AppError> {
        let result = sqlx::query(
            r#"UPDATE "control"
               SET "departure" = CURRENT_TIMESTAMP(0)
               WHERE "id" = $1 AND "user_id" = $2"#,
        )
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Foydalanuvchining barcha kelish-ketish tarixi
    pub async fn find_by_user_id(pool: &PgPool, user_id: &str) -> Result<Vec<ControlWithUser>, AppError> {
        let records = sqlx::query_as::<_, ControlWithUser>(
            r#"SELECT 
                 c."id", c."user_id", c."arrival", c."departure",
                 u."full_name" as "full_name?",
                 u."role" as "role?",
                 u."department_name" as "department_name?",
                 u."group_name" as "group_name?",
                 u."staff_position" as "staff_position?"
               FROM "control" c
               LEFT JOIN "users" u ON u."id"::text = c."user_id"
               WHERE c."user_id" = $1
               ORDER BY c."arrival" DESC"#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(records)
    }

    /// Bugungi barcha yozuvlar (admin uchun)
    pub async fn find_all_today(pool: &PgPool) -> Result<Vec<ControlWithUser>, AppError> {
        let records = sqlx::query_as::<_, ControlWithUser>(
            r#"SELECT 
                 c."id", c."user_id", c."arrival", c."departure",
                 u."full_name" as "full_name?",
                 u."role" as "role?",
                 u."department_name" as "department_name?",
                 u."group_name" as "group_name?",
                 u."staff_position" as "staff_position?"
               FROM "control" c
               LEFT JOIN "users" u ON u."id"::text = c."user_id"
               WHERE c."arrival"::date = CURRENT_DATE
               ORDER BY c."arrival" DESC"#,
        )
        .fetch_all(pool)
        .await?;

        Ok(records)
    }

    /// Yozuvni o'chirish
    pub async fn delete(pool: &PgPool, id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query(r#"DELETE FROM "control" WHERE "id" = $1"#)
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

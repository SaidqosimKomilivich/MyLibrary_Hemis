use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::token::RefreshToken;

pub struct TokenRepository;

impl TokenRepository {
    /// Yangi refresh token saqlash
    pub async fn save(
        pool: &PgPool,
        user_id: Uuid,
        token: &str,
        expires_at: DateTime<Utc>,
        user_agent: Option<&str>,
        client_ip: Option<&str>,
    ) -> Result<RefreshToken, AppError> {
        let refresh_token = sqlx::query_as::<_, RefreshToken>(
            r#"
            INSERT INTO "refresh_tokens" ("user_id", "token", "expires_at", "user_agent", "client_ip")
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(token)
        .bind(expires_at)
        .bind(user_agent)
        .bind(client_ip)
        .fetch_one(pool)
        .await?;

        Ok(refresh_token)
    }

    /// Token string bo'yicha topish
    pub async fn find_by_token(
        pool: &PgPool,
        token: &str,
    ) -> Result<Option<RefreshToken>, AppError> {
        let refresh_token = sqlx::query_as::<_, RefreshToken>(
            r#"SELECT * FROM "refresh_tokens" WHERE "token" = $1 AND "revoked_at" IS NULL"#,
        )
        .bind(token)
        .fetch_optional(pool)
        .await?;

        Ok(refresh_token)
    }

    /// Tokenni bekor qilish (revoke)
    pub async fn revoke(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            r#"UPDATE "refresh_tokens" SET "revoked_at" = CURRENT_TIMESTAMP WHERE "id" = $1"#,
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(())
    }

    // /// Foydalanuvchining barcha tokenlarini bekor qilish (barcha qurilmalardan chiqish)
    // pub async fn revoke_all_for_user(pool: &PgPool, user_id: Uuid) -> Result<(), AppError> {
    //     sqlx::query(
    //         r#"UPDATE "refresh_tokens" SET "revoked_at" = CURRENT_TIMESTAMP WHERE "user_id" = $1 AND "revoked_at" IS NULL"#,
    //     )
    //     .bind(user_id)
    //     .execute(pool)
    //     .await?;

    //     Ok(())
    // }

    /// Eski tokenni yangi token bilan almashtirish (rotation)
    pub async fn replace_token(
        pool: &PgPool,
        old_token_id: Uuid,
        new_token_str: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"UPDATE "refresh_tokens" SET "revoked_at" = CURRENT_TIMESTAMP, "replaced_by_token" = $2 WHERE "id" = $1"#,
        )
        .bind(old_token_id)
        .bind(new_token_str)
        .execute(pool)
        .await?;

        Ok(())
    }
}

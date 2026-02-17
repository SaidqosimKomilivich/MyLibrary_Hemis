use sqlx::PgPool;
use uuid::Uuid;

use crate::models::user::User;
use crate::errors::AppError;

pub struct UserRepository;

impl UserRepository {
    /// user_id (login) bo'yicha foydalanuvchini topish
    pub async fn find_by_user_id(pool: &PgPool, user_id: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"SELECT * FROM "users" WHERE "user_id" = $1 AND "active" = true"#
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// UUID bo'yicha foydalanuvchini topish
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"SELECT * FROM "users" WHERE "id" = $1 AND "active" = true"#
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Parolni yangilash
    pub async fn update_password(
        pool: &PgPool,
        id: Uuid,
        new_password_hash: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"UPDATE "users" SET "password" = $1, "is_password_update" = true WHERE "id" = $2"#
        )
        .bind(new_password_hash)
        .bind(id)
        .execute(pool)
        .await?;

        Ok(())
    }
}

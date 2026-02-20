use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::user::User;

pub struct UserRepository;

impl UserRepository {
    /// user_id (login) bo'yicha foydalanuvchini topish
    pub async fn find_by_user_id(pool: &PgPool, user_id: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"SELECT * FROM "users" WHERE "user_id" = $1 AND "active" = true"#,
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// UUID bo'yicha foydalanuvchini topish
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"SELECT * FROM "users" WHERE "id" = $1 AND "active" = true"#,
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
            r#"UPDATE "users" SET "password" = $1, "is_password_update" = true WHERE "id" = $2"#,
        )
        .bind(new_password_hash)
        .bind(id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Yangi talaba yaratish (HEMIS sinxronlash uchun)
    #[allow(clippy::too_many_arguments)]
    pub async fn create_student(
        pool: &PgPool,
        user_id: &str,
        password_hash: &str,
        full_name: &str,
        short_name: Option<&str>,
        birth_date: Option<NaiveDate>,
        image_url: Option<&str>,
        email: Option<&str>,
        id_card: i64,
        department_name: Option<&str>,
        specialty_name: Option<&str>,
        group_name: Option<&str>,
        education_form: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO "users" (
                "user_id", "password", "role", "full_name", "short_name",
                "birth_date", "image_url", "email", "id_card",
                "department_name", "specialty_name", "group_name", "education_form"
            ) VALUES ($1, $2, 'student', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            "#,
        )
        .bind(user_id)
        .bind(password_hash)
        .bind(full_name)
        .bind(short_name)
        .bind(birth_date)
        .bind(image_url)
        .bind(email)
        .bind(id_card)
        .bind(department_name)
        .bind(specialty_name)
        .bind(group_name)
        .bind(education_form)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Talaba ma'lumotlarini yangilash (HEMIS sinxronlash uchun, parol o'zgarmaydi)
    #[allow(clippy::too_many_arguments)]
    pub async fn update_student_info(
        pool: &PgPool,
        user_id: &str,
        full_name: &str,
        short_name: Option<&str>,
        birth_date: Option<NaiveDate>,
        image_url: Option<&str>,
        email: Option<&str>,
        id_card: i64,
        department_name: Option<&str>,
        specialty_name: Option<&str>,
        group_name: Option<&str>,
        education_form: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE "users" SET
                "full_name" = $1,
                "short_name" = $2,
                "birth_date" = $3,
                "image_url" = $4,
                "email" = $5,
                "id_card" = $6,
                "department_name" = $7,
                "specialty_name" = $8,
                "group_name" = $9,
                "education_form" = $10
            WHERE "user_id" = $11
            "#,
        )
        .bind(full_name)
        .bind(short_name)
        .bind(birth_date)
        .bind(image_url)
        .bind(email)
        .bind(id_card)
        .bind(department_name)
        .bind(specialty_name)
        .bind(group_name)
        .bind(education_form)
        .bind(user_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Role bo'yicha barcha foydalanuvchilarni olish
    pub async fn find_all_by_role(pool: &PgPool, role: &str) -> Result<Vec<User>, AppError> {
        let users = sqlx::query_as::<_, User>(
            r#"SELECT * FROM "users" WHERE "role" = $1 ORDER BY "full_name" ASC"#,
        )
        .bind(role)
        .fetch_all(pool)
        .await?;

        Ok(users)
    }

    /// Role bo'yicha foydalanuvchilar sonini olish (paginatsiya uchun)
    pub async fn count_by_role(
        pool: &PgPool,
        role: &str,
        search: Option<&str>,
        status: Option<&str>,
    ) -> Result<i64, AppError> {
        let mut query = String::from(r#"SELECT COUNT(*) as "count" FROM "users" WHERE "role" = $1"#);
        let mut param_idx = 2u32;

        if search.is_some() {
            query.push_str(&format!(
                r#" AND (LOWER("full_name") LIKE LOWER(${0}::text) OR LOWER(COALESCE("department_name",'')) LIKE LOWER(${0}::text) OR LOWER(COALESCE("group_name",'')) LIKE LOWER(${0}::text) OR LOWER(COALESCE("staff_position",'')) LIKE LOWER(${0}::text))"#,
                param_idx
            ));
            param_idx += 1;
        }

        match status {
            Some("active") => query.push_str(r#" AND "active" = true"#),
            Some("inactive") => query.push_str(r#" AND "active" = false"#),
            _ => {} // all — filter yo'q
        }
        let _ = param_idx; // suppress unused warning

        let mut q = sqlx::query_scalar::<_, i64>(&query);
        q = q.bind(role);

        if let Some(s) = search {
            q = q.bind(format!("%{}%", s));
        }

        let count = q.fetch_one(pool).await?;
        Ok(count)
    }

    /// Role bo'yicha paginatsiya bilan foydalanuvchilarni olish
    pub async fn find_paginated_by_role(
        pool: &PgPool,
        role: &str,
        page: i64,
        per_page: i64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> Result<Vec<User>, AppError> {
        let offset = (page - 1) * per_page;
        let mut query = String::from(r#"SELECT * FROM "users" WHERE "role" = $1"#);
        let mut param_idx = 2u32;

        if search.is_some() {
            query.push_str(&format!(
                r#" AND (LOWER("full_name") LIKE LOWER(${0}::text) OR LOWER(COALESCE("department_name",'')) LIKE LOWER(${0}::text) OR LOWER(COALESCE("group_name",'')) LIKE LOWER(${0}::text) OR LOWER(COALESCE("staff_position",'')) LIKE LOWER(${0}::text))"#,
                param_idx
            ));
            param_idx += 1;
        }

        match status {
            Some("active") => query.push_str(r#" AND "active" = true"#),
            Some("inactive") => query.push_str(r#" AND "active" = false"#),
            _ => {}
        }

        query.push_str(&format!(
            r#" ORDER BY "full_name" ASC LIMIT ${} OFFSET ${}"#,
            param_idx,
            param_idx + 1
        ));

        let mut q = sqlx::query_as::<_, User>(&query);
        q = q.bind(role);

        if let Some(s) = search {
            q = q.bind(format!("%{}%", s));
        }

        q = q.bind(per_page).bind(offset);

        let users = q.fetch_all(pool).await?;
        Ok(users)
    }

    /// Yangi xodim/o'qituvchi yaratish (HEMIS sinxronlash uchun)
    #[allow(clippy::too_many_arguments)]
    pub async fn create_employee(
        pool: &PgPool,
        user_id: &str,
        password_hash: &str,
        role: &str,
        full_name: &str,
        short_name: Option<&str>,
        birth_date: Option<NaiveDate>,
        image_url: Option<&str>,
        id_card: i64,
        department_name: Option<&str>,
        staff_position: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO "users" (
                "user_id", "password", "role", "full_name", "short_name",
                "birth_date", "image_url", "id_card",
                "department_name", "staff_position"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            "#,
        )
        .bind(user_id)
        .bind(password_hash)
        .bind(role)
        .bind(full_name)
        .bind(short_name)
        .bind(birth_date)
        .bind(image_url)
        .bind(id_card)
        .bind(department_name)
        .bind(staff_position)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Xodim/o'qituvchi ma'lumotlarini yangilash (parol o'zgarmaydi)
    #[allow(clippy::too_many_arguments)]
    pub async fn update_employee_info(
        pool: &PgPool,
        user_id: &str,
        full_name: &str,
        short_name: Option<&str>,
        birth_date: Option<NaiveDate>,
        image_url: Option<&str>,
        id_card: i64,
        department_name: Option<&str>,
        staff_position: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE "users" SET
                "full_name" = $1,
                "short_name" = $2,
                "birth_date" = $3,
                "image_url" = $4,
                "id_card" = $5,
                "department_name" = $6,
                "staff_position" = $7
            WHERE "user_id" = $8
            "#,
        )
        .bind(full_name)
        .bind(short_name)
        .bind(birth_date)
        .bind(image_url)
        .bind(id_card)
        .bind(department_name)
        .bind(staff_position)
        .bind(user_id)
        .execute(pool)
        .await?;

        Ok(())
    }
}

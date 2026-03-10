use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::user::User;

pub struct UserRepository;

impl UserRepository {
    /// Ommaviy raviashda user_id larni tekshirib mavjudlarini HashSet sifatida qaytaradi
    pub async fn find_existing_user_ids(
        pool: &PgPool,
        user_ids: &[String],
    ) -> Result<std::collections::HashSet<String>, AppError> {
        if user_ids.is_empty() {
            return Ok(std::collections::HashSet::new());
        }

        let existing_users = sqlx::query_scalar::<_, String>(
            r#"SELECT "user_id" FROM "users" WHERE "user_id" = ANY($1)"#,
        )
        .bind(user_ids)
        .fetch_all(pool)
        .await?;

        Ok(existing_users.into_iter().collect())
    }

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

    /// UUID bo'yicha foydalanuvchini topish (faqat faol)
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"SELECT * FROM "users" WHERE "id" = $1 AND "active" = true"#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// UUID bo'yicha foydalanuvchini topish (faol/nofaol farqi yo'q — admin amallar uchun)
    pub async fn find_by_id_any(pool: &PgPool, id: Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(r#"SELECT * FROM "users" WHERE "id" = $1"#)
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

    /// Parolni va aloqa ma'lumotlarni (agar ular bo'sh bo'lsa) yangilash
    pub async fn update_password_and_contacts(
        pool: &PgPool,
        id: Uuid,
        new_password_hash: &str,
        email: Option<&str>,
        phone: Option<&str>,
    ) -> Result<(), AppError> {
        let mut query = String::from(r#"UPDATE "users" SET "password" = $1, "is_password_update" = true"#);
        let mut bind_idx = 3;

        if email.is_some() {
            query.push_str(&format!(r#", "email" = COALESCE("email", ${})"#, bind_idx));
            bind_idx += 1;
        }
        if phone.is_some() {
            query.push_str(&format!(r#", "phone" = COALESCE("phone", ${})"#, bind_idx));
            // bind_idx += 1;
        }

        query.push_str(" WHERE \"id\" = $2");

        let mut q = sqlx::query(&query).bind(new_password_hash).bind(id);

        if let Some(e) = email {
            q = q.bind(e);
        }
        if let Some(p) = phone {
            q = q.bind(p);
        }

        q.execute(pool).await?;

        Ok(())
    }

    /// Parolni default holatga qaytarish (admin uchun)
    pub async fn reset_password(
        pool: &PgPool,
        id: Uuid,
        default_password_hash: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"UPDATE "users" SET "password" = $1, "is_password_update" = false WHERE "id" = $2"#,
        )
        .bind(default_password_hash)
        .bind(id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Foydalanuvchi rolini o'zgartirish (admin uchun)
    pub async fn update_role(pool: &PgPool, id: Uuid, new_role: &str) -> Result<(), AppError> {
        sqlx::query(r#"UPDATE "users" SET "role" = $1 WHERE "id" = $2"#)
            .bind(new_role)
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Foydalanuvchi faol/nofaol holatini o'zgartirish (admin uchun)
    pub async fn update_active(pool: &PgPool, id: Uuid, active: bool) -> Result<(), AppError> {
        sqlx::query(r#"UPDATE "users" SET "active" = $1 WHERE "id" = $2"#)
            .bind(active)
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    // /// Yangi talaba yaratish (HEMIS sinxronlash uchun)
    // #[allow(clippy::too_many_arguments)]
    // pub async fn create_student(
    //     pool: &PgPool,
    //     user_id: &str,
    //     password_hash: &str,
    //     full_name: &str,
    //     short_name: Option<&str>,
    //     birth_date: Option<NaiveDate>,
    //     image_url: Option<&str>,
    //     email: Option<&str>,
    //     id_card: i64,
    //     department_name: Option<&str>,
    //     specialty_name: Option<&str>,
    //     group_name: Option<&str>,
    //     education_form: Option<&str>,
    // ) -> Result<(), AppError> {
    //     sqlx::query(
    //         r#"
    //         INSERT INTO "users" (
    //             "user_id", "password", "role", "full_name", "short_name",
    //             "birth_date", "image_url", "email", "id_card",
    //             "department_name", "specialty_name", "group_name", "education_form"
    //         ) VALUES ($1, $2, 'student', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    //         "#,
    //     )
    //     .bind(user_id)
    //     .bind(password_hash)
    //     .bind(full_name)
    //     .bind(short_name)
    //     .bind(birth_date)
    //     .bind(image_url)
    //     .bind(email)
    //     .bind(id_card)
    //     .bind(department_name)
    //     .bind(specialty_name)
    //     .bind(group_name)
    //     .bind(education_form)
    //     .execute(pool)
    //     .await?;

    //     Ok(())
    // }

    // /// Talaba ma'lumotlarini yangilash (HEMIS sinxronlash uchun, parol o'zgarmaydi)
    // #[allow(clippy::too_many_arguments)]
    // pub async fn update_student_info(
    //     pool: &PgPool,
    //     user_id: &str,
    //     full_name: &str,
    //     short_name: Option<&str>,
    //     birth_date: Option<NaiveDate>,
    //     image_url: Option<&str>,
    //     email: Option<&str>,
    //     department_name: Option<&str>,
    //     specialty_name: Option<&str>,
    //     group_name: Option<&str>,
    //     education_form: Option<&str>,
    // ) -> Result<(), AppError> {
    //     sqlx::query(
    //         r#"
    //         UPDATE "users" SET
    //             "full_name" = $1,
    //             "short_name" = $2,
    //             "birth_date" = $3,
    //             "image_url" = $4,
    //             "email" = $5,
    //             "department_name" = $6,
    //             "specialty_name" = $7,
    //             "group_name" = $8,
    //             "education_form" = $9
    //         WHERE "user_id" = $10
    //         "#,
    //     )
    //     .bind(full_name)
    //     .bind(short_name)
    //     .bind(birth_date)
    //     .bind(image_url)
    //     .bind(email)
    //     .bind(department_name)
    //     .bind(specialty_name)
    //     .bind(group_name)
    //     .bind(education_form)
    //     .bind(user_id)
    //     .execute(pool)
    //     .await?;

    //     Ok(())
    // }

    /// ID karta yuklab olinganlar sonini 1 ga oshirish
    pub async fn increment_id_card_download(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        sqlx::query(r#"UPDATE "users" SET "id_card" = "id_card" + 1 WHERE "id" = $1"#)
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Ommaviy tarzda talabalarni yaratish
    pub async fn bulk_create_students<'a>(
        pool: &PgPool,
        students: impl Iterator<
            Item = (
                &'a str,           // user_id
                &'a str,           // password_hash
                &'a str,           // full_name
                Option<&'a str>,   // short_name
                Option<NaiveDate>, // birth_date
                Option<&'a str>,   // image_url
                Option<&'a str>,   // email
                i64,               // id_card
                Option<&'a str>,   // department_name
                Option<&'a str>,   // specialty_name
                Option<&'a str>,   // group_name
                Option<&'a str>,   // education_form
            ),
        >,
    ) -> Result<(), AppError> {
        let mut user_ids = Vec::new();
        let mut password_hashes = Vec::new();
        let mut full_names = Vec::new();
        let mut short_names = Vec::new();
        let mut birth_dates = Vec::new();
        let mut image_urls = Vec::new();
        let mut emails = Vec::new();
        let mut id_cards = Vec::new();
        let mut department_names = Vec::new();
        let mut specialty_names = Vec::new();
        let mut group_names = Vec::new();
        let mut education_forms = Vec::new();

        for s in students {
            user_ids.push(s.0);
            password_hashes.push(s.1);
            full_names.push(s.2);
            short_names.push(s.3);
            birth_dates.push(s.4);
            image_urls.push(s.5);
            emails.push(s.6);
            id_cards.push(s.7);
            department_names.push(s.8);
            specialty_names.push(s.9);
            group_names.push(s.10);
            education_forms.push(s.11);
        }

        if user_ids.is_empty() {
            return Ok(());
        }

        sqlx::query(
            r#"
            INSERT INTO "users" (
                "user_id", "password", "role", "full_name", "short_name",
                "birth_date", "image_url", "email", "id_card",
                "department_name", "specialty_name", "group_name", "education_form"
            )
            SELECT * FROM UNNEST (
                $1::text[], $2::text[], array_fill('student'::text, ARRAY[array_length($1::text[], 1)]), $3::text[], $4::text[],
                $5::date[], $6::text[], $7::text[], $8::bigint[],
                $9::text[], $10::text[], $11::text[], $12::text[]
            )
            "#,
        )
        .bind(&user_ids)
        .bind(&password_hashes)
        .bind(&full_names)
        .bind(&short_names)
        .bind(&birth_dates)
        .bind(&image_urls)
        .bind(&emails)
        .bind(&id_cards)
        .bind(&department_names)
        .bind(&specialty_names)
        .bind(&group_names)
        .bind(&education_forms)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Ommaviy tarzda talabalarni yangilash
    pub async fn bulk_update_students<'a>(
        pool: &PgPool,
        students: impl Iterator<
            Item = (
                &'a str,           // user_id
                &'a str,           // full_name
                Option<&'a str>,   // short_name
                Option<NaiveDate>, // birth_date
                Option<&'a str>,   // image_url
                Option<&'a str>,   // email
                Option<&'a str>,   // department_name
                Option<&'a str>,   // specialty_name
                Option<&'a str>,   // group_name
                Option<&'a str>,   // education_form
            ),
        >,
    ) -> Result<(), AppError> {
        let mut user_ids = Vec::new();
        let mut full_names = Vec::new();
        let mut short_names = Vec::new();
        let mut birth_dates = Vec::new();
        let mut image_urls = Vec::new();
        let mut emails = Vec::new();
        let mut department_names = Vec::new();
        let mut specialty_names = Vec::new();
        let mut group_names = Vec::new();
        let mut education_forms = Vec::new();

        for s in students {
            user_ids.push(s.0);
            full_names.push(s.1);
            short_names.push(s.2);
            birth_dates.push(s.3);
            image_urls.push(s.4);
            emails.push(s.5);
            department_names.push(s.6);
            specialty_names.push(s.7);
            group_names.push(s.8);
            education_forms.push(s.9);
        }

        if user_ids.is_empty() {
            return Ok(());
        }

        sqlx::query(
            r#"
            UPDATE "users" AS u SET
                "full_name" = c.full_name,
                "short_name" = c.short_name,
                "birth_date" = c.birth_date,
                "image_url" = c.image_url,
                "email" = c.email,
                "department_name" = c.department_name,
                "specialty_name" = c.specialty_name,
                "group_name" = c.group_name,
                "education_form" = c.education_form
            FROM (
                SELECT * FROM UNNEST (
                    $1::text[], $2::text[], $3::text[], $4::date[],
                    $5::text[], $6::text[], $7::text[],
                    $8::text[], $9::text[], $10::text[]
                ) AS t(user_id, full_name, short_name, birth_date, image_url, email, department_name, specialty_name, group_name, education_form)
            ) AS c
            WHERE u."user_id" = c.user_id
            "#,
        )
        .bind(&user_ids)
        .bind(&full_names)
        .bind(&short_names)
        .bind(&birth_dates)
        .bind(&image_urls)
        .bind(&emails)
        .bind(&department_names)
        .bind(&specialty_names)
        .bind(&group_names)
        .bind(&education_forms)
        .execute(pool)
        .await?;

        Ok(())
    }

    // /// Role bo'yicha barcha foydalanuvchilarni olish
    // pub async fn find_all_by_role(pool: &PgPool, role: &str) -> Result<Vec<User>, AppError> {
    //     let users = sqlx::query_as::<_, User>(
    //         r#"SELECT * FROM "users" WHERE "role" = $1 ORDER BY "full_name" ASC"#,
    //     )
    //     .bind(role)
    //     .fetch_all(pool)
    //     .await?;

    //     Ok(users)
    // }

    // /// Role bo'yicha foydalanuvchilar sonini olish (paginatsiya uchun)
    // pub async fn count_by_role(
    //     pool: &PgPool,
    //     role: &str,
    //     search: Option<&str>,
    //     status: Option<&str>,
    // ) -> Result<i64, AppError> {
    //     let mut query =
    //         String::from(r#"SELECT COUNT(*) as "count" FROM "users" WHERE "role" = $1"#);
    //     let mut param_idx = 2u32;

    //     if search.is_some() {
    //         query.push_str(&format!(
    //             r#" AND (LOWER("full_name") LIKE LOWER(${0}::text) OR LOWER(COALESCE("department_name",'')) LIKE LOWER(${0}::text) OR LOWER(COALESCE("group_name",'')) LIKE LOWER(${0}::text) OR LOWER(COALESCE("staff_position",'')) LIKE LOWER(${0}::text))"#,
    //             param_idx
    //         ));
    //         param_idx += 1;
    //     }

    //     match status {
    //         Some("active") => query.push_str(r#" AND "active" = true"#),
    //         Some("inactive") => query.push_str(r#" AND "active" = false"#),
    //         _ => {} // all — filter yo'q
    //     }
    //     let _ = param_idx; // suppress unused warning

    //     let mut q = sqlx::query_scalar::<_, i64>(&query);
    //     q = q.bind(role);

    //     if let Some(s) = search {
    //         q = q.bind(format!("%{}%", s));
    //     }

    //     let count = q.fetch_one(pool).await?;
    //     Ok(count)
    // }

    /// Array of roles bo'yicha foydalanuvchilar sonini olish (paginatsiya uchun)
    pub async fn count_by_roles(
        pool: &PgPool,
        roles: &[&str],
        search: Option<&str>,
        status: Option<&str>,
    ) -> Result<i64, AppError> {
        let mut query =
            String::from(r#"SELECT COUNT(*) as "count" FROM "users" WHERE "role" = ANY($1)"#);
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
        q = q.bind(roles);

        if let Some(s) = search {
            q = q.bind(format!("%{}%", s));
        }

        let count = q.fetch_one(pool).await?;
        Ok(count)
    }

    // /// Role bo'yicha paginatsiya bilan foydalanuvchilarni olish
    // pub async fn find_paginated_by_role(
    //     pool: &PgPool,
    //     role: &str,
    //     page: i64,
    //     per_page: i64,
    //     search: Option<&str>,
    //     status: Option<&str>,
    // ) -> Result<Vec<User>, AppError> {
    //     let offset = (page - 1) * per_page;
    //     let mut query = String::from(r#"SELECT * FROM "users" WHERE "role" = $1"#);
    //     let mut param_idx = 2u32;

    //     if search.is_some() {
    //         query.push_str(&format!(
    //             r#" AND (LOWER("full_name") LIKE LOWER(${0}::text) OR LOWER(COALESCE("department_name",'')) LIKE LOWER(${0}::text) OR LOWER(COALESCE("group_name",'')) LIKE LOWER(${0}::text) OR LOWER(COALESCE("staff_position",'')) LIKE LOWER(${0}::text))"#,
    //             param_idx
    //         ));
    //         param_idx += 1;
    //     }

    //     match status {
    //         Some("active") => query.push_str(r#" AND "active" = true"#),
    //         Some("inactive") => query.push_str(r#" AND "active" = false"#),
    //         _ => {}
    //     }

    //     query.push_str(&format!(
    //         r#" ORDER BY "full_name" ASC LIMIT ${} OFFSET ${}"#,
    //         param_idx,
    //         param_idx + 1
    //     ));

    //     let mut q = sqlx::query_as::<_, User>(&query);
    //     q = q.bind(role);

    //     if let Some(s) = search {
    //         q = q.bind(format!("%{}%", s));
    //     }

    //     q = q.bind(per_page).bind(offset);

    //     let users = q.fetch_all(pool).await?;
    //     Ok(users)
    // }

    /// Array of roles bo'yicha paginatsiya bilan foydalanuvchilarni olish
    pub async fn find_paginated_by_roles(
        pool: &PgPool,
        roles: &[&str],
        page: i64,
        per_page: i64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> Result<Vec<User>, AppError> {
        let offset = (page - 1) * per_page;
        let mut query = String::from(r#"SELECT * FROM "users" WHERE "role" = ANY($1)"#);
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
        q = q.bind(roles);

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
                "department_name" = $5,
                "staff_position" = $6
            WHERE "user_id" = $7
            "#,
        )
        .bind(full_name)
        .bind(short_name)
        .bind(birth_date)
        .bind(image_url)
        .bind(department_name)
        .bind(staff_position)
        .bind(user_id)
        .execute(pool)
        .await?;

        Ok(())
    }
}

use crate::dto::request::{BookRequestResponse, CreateBookRequestDto, UpdateRequestStatusDto};
use crate::errors::AppError;
use sqlx::PgPool;
use uuid::Uuid;

pub struct RequestRepository;

impl RequestRepository {
    /// Yangi qorov (request) yaratish
    pub async fn create_request(
        pool: &PgPool,
        user_id: Uuid,
        dto: CreateBookRequestDto,
    ) -> Result<Uuid, AppError> {
        let id = sqlx::query_scalar::<_, Uuid>(
            r#"INSERT INTO "book_requests" ("user_id", "book_id", "request_type")
               VALUES ($1, $2, $3)
               RETURNING "id""#,
        )
        .bind(user_id)
        .bind(dto.book_id)
        .bind(&dto.request_type)
        .fetch_one(pool)
        .await?;

        Ok(id)
    }

    /// Foydalanuvchining o'z so'rovlarini olishi
    pub async fn get_user_requests(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<BookRequestResponse>, AppError> {
        let requests = sqlx::query_as::<_, BookRequestResponse>(
            r#"
            SELECT 
                r."id", r."user_id", r."book_id", r."request_type", 
                r."status", r."employee_comment", r."created_at", r."updated_at",
                u."full_name" as "user_name",
                b."title" as "book_title"
            FROM "book_requests" r
            JOIN "users" u ON r."user_id" = u."id"
            JOIN "book" b ON r."book_id" = b."id"
            WHERE r."user_id" = $1
            ORDER BY r."created_at" DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(requests)
    }

    /// Barcha so'rovlarni olish (Paginatsiya bilan, admin/xodim uchun)
    pub async fn get_all_requests(
        pool: &PgPool,
        page: i64,
        per_page: i64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> Result<(Vec<BookRequestResponse>, i64), AppError> {
        let offset = (page - 1) * per_page;

        let mut query = String::from(
            r#"
            SELECT 
                r."id", r."user_id", r."book_id", r."request_type", 
                r."status", r."employee_comment", r."created_at", r."updated_at",
                u."full_name" as "user_name",
                b."title" as "book_title"
            FROM "book_requests" r
            JOIN "users" u ON r."user_id" = u."id"
            JOIN "book" b ON r."book_id" = b."id"
            WHERE 1=1
            "#,
        );
        let mut count_query = String::from(
            r#"
            SELECT COUNT(*) 
            FROM "book_requests" r
            JOIN "users" u ON r."user_id" = u."id"
            JOIN "book" b ON r."book_id" = b."id"
            WHERE 1=1
            "#,
        );

        let mut param_idx = 1u32;

        if search.is_some() {
            let s_clause = format!(
                r#" AND (LOWER(u."full_name") LIKE LOWER(${0}::text) OR LOWER(b."title") LIKE LOWER(${0}::text))"#,
                param_idx
            );
            query.push_str(&s_clause);
            count_query.push_str(&s_clause);
            param_idx += 1;
        }

        if let Some(st) = status {
            if st != "all" {
                let st_clause = format!(r#" AND r."status" = ${}"#, param_idx);
                query.push_str(&st_clause);
                count_query.push_str(&st_clause);
                param_idx += 1;
            }
        }

        query.push_str(&format!(
            r#" ORDER BY r."created_at" DESC LIMIT ${} OFFSET ${}"#,
            param_idx,
            param_idx + 1
        ));

        let mut q_count = sqlx::query_scalar::<_, i64>(&count_query);
        let mut q_items = sqlx::query_as::<_, BookRequestResponse>(&query);

        if let Some(s) = search {
            let search_val = format!("%{}%", s);
            q_count = q_count.bind(search_val.clone());
            q_items = q_items.bind(search_val);
        }

        if let Some(st) = status {
            if st != "all" {
                q_count = q_count.bind(st);
                q_items = q_items.bind(st);
            }
        }

        let total_items = q_count.fetch_one(pool).await?;

        q_items = q_items.bind(per_page).bind(offset);
        let requests = q_items.fetch_all(pool).await?;

        Ok((requests, total_items))
    }

    /// So'rov holatini yangilash (xodim/admin qismi)
    pub async fn update_request_status(
        pool: &PgPool,
        id: Uuid,
        dto: UpdateRequestStatusDto,
    ) -> Result<(), AppError> {
        let result = sqlx::query(
            r#"UPDATE "book_requests" 
               SET "status" = $1, "employee_comment" = $2, "updated_at" = CURRENT_TIMESTAMP
               WHERE "id" = $3"#,
        )
        .bind(&dto.status)
        .bind(&dto.employee_comment)
        .bind(id)
        .execute(pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("So'rov topilmadi".to_string()));
        }

        Ok(())
    }
}

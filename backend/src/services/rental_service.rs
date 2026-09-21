use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::rental::{
    CreateRentalBatchRequest, CreateRentalRequest, RentalListResponse, RentalResponse,
    ReturnRentalBatchRequest, ReturnRentalRequest,
};
use crate::errors::AppError;
use crate::repository::rental_repository::RentalRepository;

pub struct RentalService;

impl RentalService {
    /// Kitob topshirish (xodim tomonidan)
    pub async fn create_rental(
        pool: &PgPool,
        req: CreateRentalRequest,
    ) -> Result<serde_json::Value, AppError> {
        // due_date ni parse qilish
        let due_date =
            chrono::NaiveDate::parse_from_str(&req.due_date, "%Y-%m-%d").map_err(|_| {
                AppError::BadRequest("due_date formati noto'g'ri (YYYY-MM-DD kerak)".to_string())
            })?;

        // Bugun yoki o'tgan kunni tekshirish
        let today = chrono::Local::now().naive_local().date();
        if due_date <= today {
            return Err(AppError::BadRequest(
                "Qaytarish sanasi bugundan keyin bo'lishi kerak".to_string(),
            ));
        }

        // Invois raqami bo'sh emasligini tekshirish
        if req.invoice_number.trim().is_empty() {
            return Err(AppError::BadRequest(
                "Invois raqami kiritilishi shart".to_string(),
            ));
        }

        // Agar user_id UUID sifatida yuborilgan bo'lsa (eski qoldiq), uni HEMIS user_id ga aylantiramiz
        let final_user_id = if let Ok(uuid_val) = uuid::Uuid::parse_str(&req.user_id) {
            if let Some(u) = crate::repository::user_repository::UserRepository::find_by_id_any(pool, uuid_val).await? {
                u.user_id
            } else {
                req.user_id.clone()
            }
        } else {
            req.user_id.clone()
        };

        // Dublikat tekshirish: foydalanuvchida bu kitob allaqachon aktiv ijarada bormi?
        if RentalRepository::find_active_by_user_and_book(pool, &final_user_id, &req.book_id).await? {
            return Err(AppError::BadRequest(
                "bu kitobni siz avval olgansiz va hali qaytarmagansiz, kitobni berish munkin emas".to_string(),
            ));
        }

        // Kitob mavjudligini kamaytirish
        let decremented = RentalRepository::decrement_book_quantity(pool, &req.book_id).await?;
        if !decremented {
            return Err(AppError::BadRequest(
                "Kitob mavjud emas yoki omborda qolmagan".to_string(),
            ));
        }

        // Ijara yaratish
        let id = RentalRepository::create(
            pool,
            &final_user_id,
            &req.book_id,
            due_date,
            &req.invoice_number,
            req.notes.as_deref(),
        )
        .await?;

        tracing::info!(
            rental_id = %id,
            user_id = %final_user_id,
            book_id = %req.book_id,
            "Kitob topshirildi"
        );

        Ok(serde_json::json!({
            "success": true,
            "message": "Kitob muvaffaqiyatli topshirildi",
            "id": id.to_string()
        }))
    }

    /// Bir nechta kitob topshirish (batch, xodim tomonidan)
    pub async fn create_rental_batch(
        pool: &PgPool,
        req: CreateRentalBatchRequest,
    ) -> Result<serde_json::Value, AppError> {
        if req.items.is_empty() {
            return Err(AppError::BadRequest("Hech qanday kitob tanlanmagan".to_string()));
        }

        // Agar user_id UUID sifatida yuborilgan bo'lsa (eski qoldiq), uni HEMIS user_id ga aylantiramiz
        let final_user_id = if let Ok(uuid_val) = uuid::Uuid::parse_str(&req.user_id) {
            if let Some(u) = crate::repository::user_repository::UserRepository::find_by_id_any(pool, uuid_val).await? {
                u.user_id
            } else {
                req.user_id.clone()
            }
        } else {
            req.user_id.clone()
        };

        let today = chrono::Local::now().naive_local().date();
        let default_due_str = req.due_date.as_deref();

        let mut tx = pool.begin().await?;
        let mut created_ids = Vec::new();

        for item in &req.items {
            let due_str = item.due_date.as_deref().or(default_due_str).ok_or_else(|| {
                AppError::BadRequest("Qaytarish muddati ko'rsatilishi shart".to_string())
            })?;

            let due_date = chrono::NaiveDate::parse_from_str(due_str, "%Y-%m-%d").map_err(|_| {
                AppError::BadRequest(format!("Qaytarish muddati formati noto'g'ri (YYYY-MM-DD): {}", due_str))
            })?;

            if due_date <= today {
                return Err(AppError::BadRequest(
                    "Qaytarish sanasi bugundan keyin bo'lishi kerak".to_string(),
                ));
            }

            if item.invoice_number.trim().is_empty() {
                return Err(AppError::BadRequest(
                    "Har bir kitob uchun invois raqami kiritilishi shart".to_string(),
                ));
            }

            // Kitob nomini olish
            let book_title_opt: Option<(String,)> = sqlx::query_as(
                r#"SELECT "title" FROM "book" WHERE "id"::text = $1"#
            )
            .bind(&item.book_id)
            .fetch_optional(&mut *tx)
            .await?;

            let book_display = book_title_opt.map(|(t,)| format!("\"{}\"", t)).unwrap_or_else(|| format!("ID {}", item.book_id));

            // Dublikat tekshirish: foydalanuvchida bu kitob allaqachon aktiv ijarada bormi?
            let active_count: (i64,) = sqlx::query_as(
                r#"SELECT COUNT(*) FROM "book_rentals"
                   WHERE "user_id" = $1 AND "book_id" = $2 AND "status" = 'active'"#
            )
            .bind(&final_user_id)
            .bind(&item.book_id)
            .fetch_one(&mut *tx)
            .await?;

            if active_count.0 > 0 {
                return Err(AppError::BadRequest(format!(
                    "{} kitobini foydalanuvchi avval olgan va hali qaytarmagan, qayta berish mumkin emas",
                    book_display
                )));
            }

            // Kitob mavjudligini kamaytirish
            let dec_res = sqlx::query(
                r#"UPDATE "book"
                   SET "available_quantity" = "available_quantity" - 1
                   WHERE "id"::text = $1 AND "available_quantity" > 0"#
            )
            .bind(&item.book_id)
            .execute(&mut *tx)
            .await?;

            if dec_res.rows_affected() == 0 {
                return Err(AppError::BadRequest(format!(
                    "{} kitobi omborda qolmagan yoki topilmadi",
                    book_display
                )));
            }

            // Ijara yaratish
            let notes_to_save = item.notes.as_deref().or(req.notes.as_deref());
            let row: (Uuid,) = sqlx::query_as(
                r#"INSERT INTO "book_rentals" ("user_id", "book_id", "due_date", "invoice_number", "notes")
                   VALUES ($1, $2, $3, $4, $5)
                   RETURNING "id""#
            )
            .bind(&final_user_id)
            .bind(&item.book_id)
            .bind(due_date)
            .bind(item.invoice_number.trim())
            .bind(notes_to_save)
            .fetch_one(&mut *tx)
            .await?;

            created_ids.push(row.0);
        }

        tx.commit().await?;

        let count = created_ids.len();
        tracing::info!(
            user_id = %final_user_id,
            count = count,
            "Bir nechta kitob topshirildi"
        );

        Ok(serde_json::json!({
            "success": true,
            "message": format!("{} ta kitob muvaffaqiyatli topshirildi", count),
            "count": count,
            "ids": created_ids.into_iter().map(|id| id.to_string()).collect::<Vec<String>>()
        }))
    }

    /// Kitobni qaytarish
    pub async fn return_rental(
        pool: &PgPool,
        rental_id: Uuid,
        req: ReturnRentalRequest,
    ) -> Result<serde_json::Value, AppError> {
        // Avval ijarani topamiz (book_id ni olish uchun)
        let rental = RentalRepository::find_by_id(pool, rental_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Ijara topilmadi".to_string()))?;

        if rental.status != crate::models::rental::RentalStatus::Active {
            return Err(AppError::BadRequest(
                "Faqat aktiv ijaralarni qaytarish mumkin".to_string(),
            ));
        }

        // Qaytarish
        let returned = RentalRepository::return_book(pool, rental_id, req.notes.as_deref()).await?;
        if !returned {
            return Err(AppError::BadRequest(
                "Ijara qaytarishda xatolik yuz berdi".to_string(),
            ));
        }

        // Kitob sonini oshirish
        RentalRepository::increment_book_quantity(pool, &rental.book_id).await?;

        tracing::info!(
            rental_id = %rental_id,
            user_id = %rental.user_id,
            book_id = %rental.book_id,
            "Kitob qaytarildi"
        );

        Ok(serde_json::json!({
            "success": true,
            "message": "Kitob muvaffaqiyatli qaytarildi"
        }))
    }

    /// Bir nechta kitobni qaytarish (batch, xodim tomonidan)
    pub async fn return_rental_batch(
        pool: &PgPool,
        req: ReturnRentalBatchRequest,
    ) -> Result<serde_json::Value, AppError> {
        if req.items.is_empty() {
            return Err(AppError::BadRequest("Hech qanday kitob tanlanmagan".to_string()));
        }

        let mut tx = pool.begin().await?;
        let mut returned_ids = Vec::new();

        for item in &req.items {
            // Ijara va kitob ma'lumotlarini olish
            let rental_opt: Option<(Uuid, String, String, String)> = sqlx::query_as(
                r#"SELECT r."id", r."book_id", r."status"::text, COALESCE(b."title", 'Noma''lum')
                   FROM "book_rentals" r
                   LEFT JOIN "book" b ON b."id"::text = r."book_id"
                   WHERE r."id" = $1"#
            )
            .bind(item.rental_id)
            .fetch_optional(&mut *tx)
            .await?;

            let (rental_id, book_id, status, title) = rental_opt.ok_or_else(|| {
                AppError::NotFound(format!("Ijara topilmadi: {}", item.rental_id))
            })?;

            if status != "active" {
                return Err(AppError::BadRequest(format!(
                    "\"{}\" kitobi faol ijara holatida emas (hozirgi holati: {})",
                    title, status
                )));
            }

            let notes_to_save = item.notes.as_deref().or(req.notes.as_deref());

            // Qaytarish
            let upd_res = sqlx::query(
                r#"UPDATE "book_rentals"
                   SET "status" = 'returned',
                       "return_date" = CURRENT_DATE,
                       "notes" = COALESCE($2, "notes")
                   WHERE "id" = $1 AND "status" = 'active'"#
            )
            .bind(rental_id)
            .bind(notes_to_save)
            .execute(&mut *tx)
            .await?;

            if upd_res.rows_affected() == 0 {
                return Err(AppError::BadRequest(format!(
                    "\"{}\" kitobini qaytarishda xatolik yuz berdi",
                    title
                )));
            }

            // Kitob sonini oshirish
            sqlx::query(
                r#"UPDATE "book"
                   SET "available_quantity" = "available_quantity" + 1
                   WHERE "id"::text = $1"#
            )
            .bind(&book_id)
            .execute(&mut *tx)
            .await?;

            returned_ids.push(rental_id);
        }

        tx.commit().await?;

        let count = returned_ids.len();
        tracing::info!(
            count = count,
            "Bir nechta kitob qaytarildi"
        );

        Ok(serde_json::json!({
            "success": true,
            "message": format!("{} ta kitob muvaffaqiyatli qabul qilindi", count),
            "count": count,
            "returned_ids": returned_ids.into_iter().map(|id| id.to_string()).collect::<Vec<String>>()
        }))
    }

    /// Barcha ijaralar (filtr bilan) — admin/staff uchun
    pub async fn get_rentals(
        pool: &PgPool,
        status: Option<&str>,
        user_id: Option<&str>,
    ) -> Result<RentalListResponse, AppError> {
        let records = RentalRepository::find_all(pool, status, user_id).await?;
        let total = records.len();
        let data: Vec<RentalResponse> = records.into_iter().map(|r| r.into_response()).collect();

        Ok(RentalListResponse {
            success: true,
            data,
            total,
        })
    }

    /// Bitta ijara — admin/staff uchun
    pub async fn get_rental_by_id(pool: &PgPool, id: Uuid) -> Result<RentalResponse, AppError> {
        let record = RentalRepository::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Ijara topilmadi".to_string()))?;

        Ok(record.into_response())
    }

    /// Foydalanuvchining o'z ijaralari (my rentals)
    pub async fn get_my_rentals(
        pool: &PgPool,
        user_id: &str,
    ) -> Result<RentalListResponse, AppError> {
        let records = RentalRepository::find_all(pool, None, Some(user_id)).await?;
        let total = records.len();
        let data: Vec<RentalResponse> = records.into_iter().map(|r| r.into_response()).collect();

        Ok(RentalListResponse {
            success: true,
            data,
            total,
        })
    }
}

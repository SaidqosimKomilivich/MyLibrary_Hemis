use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::rental::{
    CreateRentalRequest, RentalListResponse, RentalResponse, ReturnRentalRequest,
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

        // Dublikat tekshirish: foydalanuvchida bu kitob allaqachon aktiv ijarada bormi?
        if RentalRepository::find_active_by_user_and_book(pool, &req.user_id, &req.book_id).await? {
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
            &req.user_id,
            &req.book_id,
            due_date,
            req.notes.as_deref(),
        )
        .await?;

        tracing::info!(
            rental_id = %id,
            user_id = %req.user_id,
            book_id = %req.book_id,
            "Kitob topshirildi"
        );

        Ok(serde_json::json!({
            "success": true,
            "message": "Kitob muvaffaqiyatli topshirildi",
            "id": id.to_string()
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

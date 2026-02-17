use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::reading::{CreateReadingRequest, ReadingListResponse};
use crate::errors::AppError;
use crate::repository::reading_repository::ReadingRepository;

pub struct ReadingService;

impl ReadingService {
    /// Kitob o'qishni boshlash
    pub async fn start_reading(
        pool: &PgPool,
        user_id: &str,
        req: CreateReadingRequest,
    ) -> Result<serde_json::Value, AppError> {
        // Tekshirish: allaqachon o'qilayotganmi?
        if ReadingRepository::exists(pool, user_id, &req.book_id).await? {
            return Err(AppError::BadRequest(
                "Bu kitob allaqachon o'qilayotganlar ro'yxatida mavjud".to_string(),
            ));
        }

        let id = ReadingRepository::create(
            pool,
            user_id,
            &req.book_id,
            req.book_type.as_deref(),
            req.page,
            req.audio,
        )
        .await?;

        tracing::info!(user_id = %user_id, book_id = %req.book_id, "Kitob o'qish boshlandi");

        Ok(serde_json::json!({
            "success": true,
            "message": "Kitob o'qiyotganlar ro'yxatiga qo'shildi",
            "id": id.to_string()
        }))
    }

    /// Foydalanuvchining o'qiyotgan kitoblari
    pub async fn get_user_readings(
        pool: &PgPool,
        user_id: &str,
    ) -> Result<ReadingListResponse, AppError> {
        let readings = ReadingRepository::find_by_user_id(pool, user_id).await?;
        let data = readings.into_iter().map(|r| r.into_response()).collect();

        Ok(ReadingListResponse {
            success: true,
            data,
        })
    }

    /// O'qishni o'chirish
    pub async fn remove_reading(
        pool: &PgPool,
        reading_id: Uuid,
        user_id: &str,
    ) -> Result<serde_json::Value, AppError> {
        let deleted = ReadingRepository::delete(pool, reading_id, user_id).await?;

        if !deleted {
            return Err(AppError::NotFound("O'qish topilmadi".to_string()));
        }

        tracing::info!(user_id = %user_id, reading_id = %reading_id, "O'qish o'chirildi");

        Ok(serde_json::json!({
            "success": true,
            "message": "Kitob o'qiyotganlar ro'yxatidan olib tashlandi"
        }))
    }
}

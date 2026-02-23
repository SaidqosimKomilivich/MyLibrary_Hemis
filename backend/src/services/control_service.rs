use sqlx::PgPool;

use crate::dto::control::{ControlListResponse, ControlResponse};
use crate::errors::AppError;
use crate::models::control::Control;
use crate::repository::control_repository::{ControlRepository, ControlWithUser};

pub struct ControlService;

impl ControlService {
    /// Control modelini ControlResponse DTOga aylantirish
    fn to_response(record: Control) -> ControlResponse {
        ControlResponse {
            id: record.id,
            user_id: record.user_id,
            arrival: record
                .arrival
                .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
            departure: record
                .departure
                .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
            full_name: None,
            role: None,
            department_name: None,
            group_name: None,
            staff_position: None,
        }
    }

    /// ControlWithUser ni ControlResponse DTOga aylantirish
    fn to_response_with_user(record: ControlWithUser) -> ControlResponse {
        ControlResponse {
            id: record.id,
            user_id: record.user_id,
            arrival: record
                .arrival
                .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
            departure: record
                .departure
                .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
            full_name: record.full_name,
            role: record.role,
            department_name: record.department_name,
            group_name: record.group_name,
            staff_position: record.staff_position,
        }
    }

    /// Foydalanuvchi kelganini qayd etish
    pub async fn arrive(pool: &PgPool, user_id: &str) -> Result<serde_json::Value, AppError> {
        // Tekshirish: bugun allaqachon aktiv sessiya bormi?
        if let Some(_active) = ControlRepository::find_active_by_user_id(pool, user_id).await? {
            return Err(AppError::BadRequest(
                "Siz allaqachon kirgansiz. Avval chiqishni qayd eting.".to_string(),
            ));
        }

        let record = ControlRepository::arrive(pool, user_id).await?;

        tracing::info!(user_id = %user_id, control_id = %record.id, "Foydalanuvchi keldi");

        Ok(serde_json::json!({
            "success": true,
            "message": "Kelish muvaffaqiyatli qayd etildi",
            "data": Self::to_response(record)
        }))
    }

    /// Foydalanuvchi ketganini qayd etish
    pub async fn depart(pool: &PgPool, user_id: &str) -> Result<serde_json::Value, AppError> {
        // Aktiv sessiyani topish
        let active = ControlRepository::find_active_by_user_id(pool, user_id)
            .await?
            .ok_or_else(|| {
                AppError::BadRequest(
                    "Aktiv sessiya topilmadi. Avval kirishni qayd eting.".to_string(),
                )
            })?;

        ControlRepository::depart(pool, active.id, user_id).await?;

        tracing::info!(user_id = %user_id, control_id = %active.id, "Foydalanuvchi ketdi");

        Ok(serde_json::json!({
            "success": true,
            "message": "Ketish muvaffaqiyatli qayd etildi"
        }))
    }

    /// Foydalanuvchining kelish-ketish tarixi
    pub async fn get_user_history(
        pool: &PgPool,
        user_id: &str,
    ) -> Result<ControlListResponse, AppError> {
        let records = ControlRepository::find_by_user_id(pool, user_id).await?;
        let total = records.len();
        let data = records.into_iter().map(Self::to_response_with_user).collect();

        Ok(ControlListResponse {
            success: true,
            data,
            total,
        })
    }

    /// Bugungi barcha yozuvlar (admin uchun)
    pub async fn get_today_all(pool: &PgPool) -> Result<ControlListResponse, AppError> {
        let records = ControlRepository::find_all_today(pool).await?;
        let total = records.len();
        let data = records.into_iter().map(Self::to_response_with_user).collect();

        Ok(ControlListResponse {
            success: true,
            data,
            total,
        })
    }
}

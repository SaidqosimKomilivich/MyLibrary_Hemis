use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::notification::{CreateNotificationRequest, NotificationResponse};
use crate::errors::AppError;
use crate::models::notification::Notification;

pub struct NotificationRepository;

impl NotificationRepository {
    /// Yangi xabarnoma yaratish
    pub async fn create(
        pool: &PgPool,
        req: &CreateNotificationRequest,
        sender_id: Option<Uuid>,
    ) -> Result<Notification, AppError> {
        let notification = sqlx::query_as!(
            Notification,
            r#"
            INSERT INTO notifications (user_id, sender_id, title, message, type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, sender_id, title, message, type as notification_type, is_read, created_at
            "#,
            req.user_id,
            sender_id,
            req.title,
            req.message,
            req.type_
        )
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::InternalError(format!("Xabarnoma yaratishda xatolik: {}", e)))?;

        Ok(notification)
    }

    /// Foydalanuvchi xabarnomalarini olish
    pub async fn find_by_user(
        pool: &PgPool,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<NotificationResponse>, AppError> {
        // Here we join with users table to get sender name if needed,
        // but for now let's just return notifications.
        // We select sender's name if sender_id is present.

        let notifications = sqlx::query!(
            r#"
            SELECT 
                n.id, n.title, n.message, n.type, n.is_read, n.created_at,
                u.full_name as sender_name
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            user_id,
            limit,
            offset
        )
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::InternalError(format!("Xabarnomalarni olishda xatolik: {}", e)))?;

        let responses = notifications
            .into_iter()
            .map(|row| NotificationResponse {
                id: row.id,
                title: row.title,
                message: row.message,
                type_: row.r#type,
                is_read: row.is_read,
                created_at: row
                    .created_at
                    .map(|t: chrono::DateTime<chrono::Utc>| t.to_rfc3339())
                    .unwrap_or_default(),
                sender_name: Some(row.sender_name),
            })
            .collect();

        Ok(responses)
    }

    /// Xabarnomani o'qilgan deb belgilash
    pub async fn mark_as_read(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid, // Ensure ownership
    ) -> Result<(), AppError> {
        let result = sqlx::query!(
            r#"
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = $1::uuid AND user_id = $2::uuid
            "#,
            id,
            user_id
        )
        .execute(pool)
        .await
        .map_err(|e| AppError::InternalError(format!("Xabarnomani yangilashda xatolik: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Xabarnoma topilmadi".to_string()));
        }

        Ok(())
    }

    /// Barcha xabarnomalarni o'qilgan deb belgilash
    pub async fn mark_all_as_read(pool: &PgPool, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query!(
            r#"
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = $1::uuid AND is_read = FALSE
            "#,
            user_id
        )
        .execute(pool)
        .await
        .map_err(|e| {
            AppError::InternalError(format!("Xabarnomalarni yangilashda xatolik: {}", e))
        })?;

        Ok(())
    }

    /// O'qilmagan xabarnomalar sonini olish
    pub async fn get_unread_count(pool: &PgPool, user_id: Uuid) -> Result<i64, AppError> {
        let rec = sqlx::query!(
            r#"
            SELECT count(*) as "count!"
            FROM notifications
            WHERE user_id = $1 AND is_read = FALSE
            "#,
            user_id
        )
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::InternalError(format!("Sanoqni olishda xatolik: {}", e)))?;

        Ok(rec.count)
    }
}

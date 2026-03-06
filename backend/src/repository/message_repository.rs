use crate::dto::message::{MessageResponseDto, SendMessageDto};
use crate::models::message::Message;
use sqlx::PgPool;
use uuid::Uuid;
use crate::errors::AppError;

pub struct MessageRepository;

impl MessageRepository {
    pub async fn create(
        pool: &PgPool,
        sender_id: Option<Uuid>,
        payload: &SendMessageDto,
    ) -> Result<MessageResponseDto, AppError> {
        let message = sqlx::query_as!(
            Message,
            r#"
            INSERT INTO messages (sender_id, receiver_id, title, message)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
            sender_id,
            payload.receiver_id,
            payload.title,
            payload.message
        )
        .fetch_one(pool)
        .await?;

        // Also fetch the sender's name/role for the response 
        let sender_info = if let Some(sid) = sender_id {
            sqlx::query!(
                "SELECT full_name, role FROM users WHERE id = $1",
                sid
            )
            .fetch_optional(pool)
            .await?
        } else {
            None
        };

        let receiver_info = sqlx::query!(
            "SELECT full_name, role FROM users WHERE id = $1",
            payload.receiver_id
        )
        .fetch_optional(pool)
        .await?;

        Ok(MessageResponseDto {
            id: message.id,
            sender_id: message.sender_id,
            receiver_id: message.receiver_id,
            sender_name: sender_info.as_ref().map(|s| s.full_name.clone()),
            sender_role: sender_info.as_ref().map(|s| s.role.clone()),
            receiver_name: receiver_info.as_ref().map(|r| r.full_name.clone()),
            receiver_role: receiver_info.as_ref().map(|r| r.role.clone()),
            title: message.title,
            message: message.message,
            is_read: message.is_read,
            created_at: message.created_at,
        })
    }

    pub async fn get_user_messages(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<MessageResponseDto>, AppError> {
        let messages = sqlx::query!(
            r#"
            SELECT 
                m.id, m.sender_id, m.receiver_id, m.title, m.message, m.is_read, m.created_at,
                s.full_name as "sender_name?",
                s.role as "sender_role?",
                r.full_name as "receiver_name?",
                r.role as "receiver_role?"
            FROM messages m
            LEFT JOIN users s ON m.sender_id = s.id
            LEFT JOIN users r ON m.receiver_id = r.id
            WHERE m.receiver_id = $1 OR m.sender_id = $1
            ORDER BY m.created_at ASC
            "#,
            user_id
        )
        .fetch_all(pool)
        .await?;

        let res = messages.into_iter().map(|row| MessageResponseDto {
            id: row.id,
            sender_id: row.sender_id,
            receiver_id: row.receiver_id,
            sender_name: row.sender_name,
            sender_role: row.sender_role,
            receiver_name: row.receiver_name,
            receiver_role: row.receiver_role,
            title: row.title,
            message: row.message,
            is_read: row.is_read,
            created_at: row.created_at,
        }).collect();

        Ok(res)
    }

    pub async fn get_all_messages(
        pool: &PgPool,
    ) -> Result<Vec<MessageResponseDto>, AppError> {
        let messages = sqlx::query!(
            r#"
            SELECT 
                m.id, m.sender_id, m.receiver_id, m.title, m.message, m.is_read, m.created_at,
                s.full_name as "sender_name?",
                s.role as "sender_role?",
                r.full_name as "receiver_name?",
                r.role as "receiver_role?"
            FROM messages m
            LEFT JOIN users s ON m.sender_id = s.id
            LEFT JOIN users r ON m.receiver_id = r.id
            ORDER BY m.created_at ASC
            "#
        )
        .fetch_all(pool)
        .await?;

        let res = messages.into_iter().map(|row| MessageResponseDto {
            id: row.id,
            sender_id: row.sender_id,
            receiver_id: row.receiver_id,
            sender_name: row.sender_name,
            sender_role: row.sender_role,
            receiver_name: row.receiver_name,
            receiver_role: row.receiver_role,
            title: row.title,
            message: row.message,
            is_read: row.is_read,
            created_at: row.created_at,
        }).collect();

        Ok(res)
    }

    pub async fn count_unread(pool: &PgPool, user_id: Uuid) -> Result<i64, AppError> {
        let res = sqlx::query!(
            "SELECT count(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false",
            user_id
        )
        .fetch_one(pool)
        .await?;

        Ok(res.count.unwrap_or(0))
    }

    pub async fn mark_as_read(pool: &PgPool, message_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query!(
            "UPDATE messages SET is_read = true WHERE id = $1 AND receiver_id = $2",
            message_id,
            user_id
        )
        .execute(pool)
        .await?;

        Ok(())
    }
}

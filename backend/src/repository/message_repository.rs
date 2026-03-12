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
            category: None,
            images: None,
            is_read: message.is_read,

            created_at: message.created_at,
        })
    }

    pub async fn get_user_conversations_paginated(
        pool: &PgPool,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<MessageResponseDto>, AppError> {
        let conversations = sqlx::query!(
            r#"
            SELECT 
                u.id as contact_id,
                u.full_name as contact_name,
                u.role as contact_role,
                m.id as "message_id?",
                m.sender_id as "sender_id?",
                m.receiver_id as "receiver_id?",
                m.title as "title?",
                m.message as "message_text?",
                m.is_read as "is_read?",
                m.created_at as "created_at?",
                s.full_name as "sender_name_full?",
                s.role as "sender_role_full?",
                r.full_name as "receiver_name_full?",
                r.role as "receiver_role_full?"
            FROM users u
            LEFT JOIN LATERAL (
                SELECT msg.id, msg.sender_id, msg.receiver_id, msg.title, msg.message, msg.is_read, msg.created_at
                FROM messages msg 
                WHERE (msg.sender_id = $1 AND msg.receiver_id = u.id) 
                   OR (msg.sender_id = u.id AND msg.receiver_id = $1)
                ORDER BY msg.created_at DESC 
                LIMIT 1
            ) m ON true
            LEFT JOIN users s ON m.sender_id = s.id
            LEFT JOIN users r ON m.receiver_id = r.id
            WHERE u.active = true 
              AND u.id != $1 
              AND u.role IN ('admin', 'staff', 'teacher', 'student', 'employee')
            ORDER BY m.created_at DESC NULLS LAST, u.full_name ASC
            LIMIT $2 OFFSET $3
            "#,
            user_id,
            limit,
            offset
        )
        .fetch_all(pool)
        .await?;

        let res = conversations.into_iter().map(|row| {
            if let Some(msg_id) = row.message_id {
                // Foydalanuvchi bilan yozishma mavjud
                MessageResponseDto {
                    id: msg_id,
                    sender_id: row.sender_id,
                    receiver_id: row.receiver_id,
                    sender_name: row.sender_name_full,
                    sender_role: row.sender_role_full,
                    receiver_name: row.receiver_name_full,
                    receiver_role: row.receiver_role_full,
                    title: row.title.unwrap_or_default(),
                    message: row.message_text.unwrap_or_default(),
                    category: None,
                    images: None,
                    is_read: row.is_read.unwrap_or(true),
                    created_at: row.created_at.unwrap_or_else(|| chrono::Utc::now()),
                }
            } else {
                // Foydalanuvchi bilan hali yozishma yo'q, "bo'sh" qolip qaytaramiz
                MessageResponseDto {
                    id: Uuid::nil(),          // Dummy ID
                    sender_id: Some(row.contact_id), // UI uni tanib olishi uchun contact_id ni sender_id sifatida beramiz
                    receiver_id: Some(user_id),
                    sender_name: Some(row.contact_name), // Bu ism UI da chiqishi uchun
                    sender_role: Some(row.contact_role),
                    receiver_name: None,
                    receiver_role: None,
                    title: "".to_string(),
                    message: "".to_string(),
                    category: None,
                    images: None,
                    is_read: true, // yozishma yo'q, o'qilmagan narsa ham yo'q
                    created_at: chrono::DateTime::from_timestamp(0, 0).unwrap().into(), // Eski sana qilib qo'yamiz
                }
            }
        }).collect();

        Ok(res)
    }

    pub async fn count_user_conversations(pool: &PgPool, user_id: Uuid) -> Result<i64, AppError> {
        let res = sqlx::query!(
            r#"
            SELECT count(*) as count
            FROM users
            WHERE active = true 
              AND id != $1 
              AND role IN ('admin', 'staff', 'teacher', 'student', 'employee')
            "#,
            user_id
        )
        .fetch_one(pool)
        .await?;
        Ok(res.count.unwrap_or(0))
    }

    // pub async fn count_all_conversations(pool: &PgPool) -> Result<i64, AppError> {
    //     let res = sqlx::query!(
    //         "SELECT count(DISTINCT (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))) as count FROM messages"
    //     )
    //     .fetch_one(pool)
    //     .await?;
    //     Ok(res.count.unwrap_or(0))
    // }

    pub async fn count_unread(pool: &PgPool, user_id: Uuid) -> Result<i64, AppError> {
        let res = sqlx::query!(
            "SELECT count(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false",
            user_id
        )
        .fetch_one(pool)
        .await?;

        Ok(res.count.unwrap_or(0))
    }

    pub async fn get_chat_history(
        pool: &PgPool,
        user_id: Uuid,
        contact_id: Uuid,
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
            WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
               OR (m.sender_id = $2 AND m.receiver_id = $1)
            ORDER BY m.created_at ASC
            "#,
            user_id,
            contact_id
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
            category: None,
            images: None,
            is_read: row.is_read,
            created_at: row.created_at,
        }).collect();

        Ok(res)
    }

    pub async fn get_system_chat_history(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<MessageResponseDto>, AppError> {
        let messages = sqlx::query!(
            r#"
            SELECT 
                id, sender_id, receiver_id, title, message, is_read, created_at
            FROM messages
            WHERE sender_id IS NULL AND receiver_id = $1
            ORDER BY created_at ASC
            "#,
            user_id
        )
        .fetch_all(pool)
        .await?;

        let res = messages.into_iter().map(|row| MessageResponseDto {
            id: row.id,
            sender_id: row.sender_id,
            receiver_id: row.receiver_id,
            sender_name: Some("Tizim".to_string()),
            sender_role: Some("System".to_string()),
            receiver_name: None, // could fetch receiver name but not needed for frontend render
            receiver_role: None,
            title: row.title,
            message: row.message,
            category: None,
            images: None,
            is_read: row.is_read,
            created_at: row.created_at,
        }).collect();

        Ok(res)
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

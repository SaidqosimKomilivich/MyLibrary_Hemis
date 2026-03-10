use sqlx::PgPool;
use uuid::Uuid;
use crate::errors::AppError;
use crate::models::announcement::{Announcement, AnnouncementWithStatus, AnnouncementReadStatus};

pub struct AnnouncementRepository;

impl AnnouncementRepository {
    pub async fn create(
        pool: &PgPool,
        sender_id: Option<Uuid>,
        title: &str,
        message: &str,
        category: Option<String>,
        images: Option<Vec<String>>,
    ) -> Result<Announcement, AppError> {
        let announcement = sqlx::query_as!(
            Announcement,
            r#"
            INSERT INTO announcements (sender_id, title, message, category, images)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, sender_id, title, message, category, images, created_at as "created_at: _"
            "#,
            sender_id,
            title,
            message,
            category,
            images.as_deref()
        )
        .fetch_one(pool)
        .await?;

        Ok(announcement)
    }

    pub async fn list_for_user(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<AnnouncementWithStatus>, AppError> {
        let announcements = sqlx::query!(
            r#"
            SELECT 
                a.id, a.sender_id, a.title, a.message, a.category, a.images, a.created_at,
                u.full_name as "sender_name?",
                EXISTS(SELECT 1 FROM announcement_reads ar WHERE ar.announcement_id = a.id AND ar.user_id = $1) as "is_read!"
            FROM announcements a
            LEFT JOIN users u ON a.sender_id = u.id
            ORDER BY a.created_at DESC
            "#,
            user_id
        )
        .fetch_all(pool)
        .await?;

        let res = announcements.into_iter().map(|row| AnnouncementWithStatus {
            id: row.id,
            sender_id: row.sender_id,
            sender_name: row.sender_name,
            title: row.title,
            message: row.message,
            category: row.category,
            images: row.images,
            is_read: row.is_read,
            created_at: row.created_at,
        }).collect();

        Ok(res)
    }

    pub async fn mark_as_read(
        pool: &PgPool,
        user_id: Uuid,
        announcement_id: Uuid,
    ) -> Result<(), AppError> {
        sqlx::query!(
            r#"
            INSERT INTO announcement_reads (user_id, announcement_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, announcement_id) DO NOTHING
            "#,
            user_id,
            announcement_id
        )
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Fetches who read a specific announcement with pagination (5 items per page)
    pub async fn get_read_status_paginated(
        pool: &PgPool,
        announcement_id: Uuid,
        page: i64,
    ) -> Result<(Vec<AnnouncementReadStatus>, i64), AppError> {
        let limit = 5_i64;
        let offset = (page.max(1) - 1) * limit;

        let rows = sqlx::query!(
            r#"
            SELECT 
                ar.user_id, ar.read_at,
                u.full_name as "full_name!", u.role as "role!"
            FROM announcement_reads ar
            JOIN users u ON ar.user_id = u.id
            WHERE ar.announcement_id = $1
            ORDER BY ar.read_at DESC
            LIMIT $2 OFFSET $3
            "#,
            announcement_id,
            limit,
            offset
        )
        .fetch_all(pool)
        .await?;

        let total = sqlx::query_scalar!(
            "SELECT COUNT(*) as \"count!\" FROM announcement_reads WHERE announcement_id = $1",
            announcement_id
        )
        .fetch_one(pool)
        .await?;

        let data = rows.into_iter().map(|r| AnnouncementReadStatus {
            user_id: r.user_id,
            full_name: r.full_name,
            role: r.role,
            read_at: r.read_at,
        }).collect();

        Ok((data, total))
    }
}

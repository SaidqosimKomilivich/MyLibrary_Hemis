use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub sender_id: Option<Uuid>,
    pub title: String,
    pub message: String,

    // Actually sqlx maps "type" column to "type_" field if we use `#[sqlx(rename = "type")]` or just handle it in query.
    // For FromRow/query_as to work automatically, field names must match.
    // "type" is a partial keyword (can be used as field name in 2018+ edition? no, it's strict).
    // We need `#[sqlx(rename = "type")]`.
    #[sqlx(rename = "type")]
    pub notification_type: String, // Renaming field to avoid keyword collision
    pub is_read: bool,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

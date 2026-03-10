use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Announcement {
    pub id: Uuid,
    pub sender_id: Option<Uuid>,
    pub title: String,
    pub message: String,
    pub category: Option<String>,
    pub images: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
}

// #[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
// pub struct AnnouncementRead {
//     pub user_id: Uuid,
//     pub announcement_id: Uuid,
//     pub read_at: DateTime<Utc>,
// }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnouncementWithStatus {
    pub id: Uuid,
    pub sender_id: Option<Uuid>,
    pub sender_name: Option<String>,
    pub title: String,
    pub message: String,
    pub category: Option<String>,
    pub images: Option<Vec<String>>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnouncementReadStatus {
    pub user_id: Uuid,
    pub full_name: String,
    pub role: String,
    pub read_at: DateTime<Utc>,
}

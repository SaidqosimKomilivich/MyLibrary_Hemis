use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessageDto {
    pub receiver_id: Uuid,
    #[serde(default)]
    pub title: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageResponseDto {
    pub id: Uuid,
    pub sender_id: Option<Uuid>,
    pub receiver_id: Option<Uuid>,
    pub sender_name: Option<String>,
    pub sender_role: Option<String>,
    pub receiver_name: Option<String>,
    pub receiver_role: Option<String>,
    pub title: String,
    pub message: String,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnreadCountDto {
    pub unread_count: i64,
}

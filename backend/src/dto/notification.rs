use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateNotificationRequest {
    pub user_id: Uuid, // Receiver
    pub title: String,
    pub message: String,
    pub type_: String, // "info", "warning", etc.
}

#[derive(Debug, Serialize)]
pub struct NotificationResponse {
    pub id: Uuid,
    pub title: String,
    pub message: String,
    pub type_: String,
    pub is_read: bool,
    pub created_at: String,
    pub sender_name: Option<String>, // Optional: include sender name if needed
}

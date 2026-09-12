use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Yangilikka biriktirilgan hujjat modeli
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NewsAttachment {
    pub id: Uuid,
    pub news_id: Uuid,
    pub file_url: String,
    pub file_name: String,
    pub file_size: i64,
    pub file_type: String,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

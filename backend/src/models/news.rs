use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Yangilik ma'lumotlar bazasi modeli
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct News {
    pub id: Uuid,

    // Asosiy mazmun
    pub title: String,
    pub slug: String,
    pub summary: Option<String>,
    pub content: String,

    // Media
    pub images: Vec<String>,

    // Klassifikatsiya
    pub category: Option<String>,
    pub tags: Vec<String>,

    // Muallif
    pub author_id: Option<Uuid>,

    // Nashr holati
    pub is_published: bool,
    pub published_at: Option<DateTime<Utc>>,

    // Vaqt tamg'alari
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Book {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub subtitle: Option<String>,
    pub translator: Option<String>,
    pub isbn_13: Option<String>,
    pub isbn_10: Option<String>,
    pub publisher: Option<String>,
    pub publication_date: Option<i32>,
    pub edition: Option<String>,
    pub language: Option<String>,
    pub category: Option<String>,
    pub genre: Option<String>,
    pub description: Option<String>,
    pub page_count: Option<i32>,
    pub duration_seconds: Option<i32>,
    pub format: Option<String>,
    pub cover_image_url: Option<String>,
    pub digital_file_url: Option<String>,
    pub shelf_location: Option<String>,
    pub total_quantity: Option<i32>,
    pub available_quantity: Option<i32>,
    pub rating: Option<f64>,
    pub is_active: Option<bool>,
    pub submitted_by: Option<String>,
    pub admin_comment: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

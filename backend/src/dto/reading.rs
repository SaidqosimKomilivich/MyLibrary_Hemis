use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Kitob o'qishni boshlash uchun DTO
#[derive(Debug, Deserialize)]
pub struct CreateReadingRequest {
    pub book_id: String,
    #[serde(rename = "bookType")]
    pub book_type: Option<String>,
    pub page: Option<i32>,
    pub audio: Option<i32>,
}

/// O'qiyotgan kitob javobi (kitob ma'lumotlari bilan)
#[derive(Debug, Serialize)]
pub struct ReadingResponse {
    pub id: Uuid,
    pub user_id: String,
    pub book_id: String,
    pub start: Option<String>,
    pub finish: Option<String>,
    pub book_type: Option<String>,
    pub audio: Option<i32>,
    pub page: Option<i32>,
    pub state: Option<bool>,
    // Kitob ma'lumotlari
    pub book_title: Option<String>,
    pub book_author: Option<String>,
    pub book_cover: Option<String>,
    pub book_category: Option<String>,
    pub book_page_count: Option<i32>,
    pub book_format: Option<String>,
    pub book_digital_file_url: Option<String>,
}

/// O'qiyotgan kitoblar ro'yxati
#[derive(Debug, Serialize)]
pub struct ReadingListResponse {
    pub success: bool,
    pub data: Vec<ReadingResponse>,
}

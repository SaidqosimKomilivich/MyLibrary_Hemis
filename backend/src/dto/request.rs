use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateBookRequestDto {
    pub book_id: Uuid,
    pub request_type: String, // 'physical' yoki 'electronic'
}

#[derive(Debug, Deserialize)]
pub struct UpdateRequestStatusDto {
    pub status: String, // 'pending', 'processing', 'ready', 'rejected'
    pub employee_comment: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct BookRequestResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub book_id: Uuid,
    pub user_name: String,  // JOIN orqali olinadi
    pub book_title: String, // JOIN orqali olinadi
    pub book_author: Option<String>,
    pub available_quantity: Option<i32>,
    pub total_quantity: Option<i32>,
    pub shelf_location: Option<String>,
    pub cover_image_url: Option<String>,
    pub request_type: String,
    pub status: String,
    pub employee_id: Option<Uuid>,
    pub employee_name: Option<String>,
    pub employee_comment: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedRequestsResponse {
    pub success: bool,
    pub data: Vec<BookRequestResponse>,
    pub pagination: crate::dto::user::UserPaginationInfo, // bir xil struct ishlatsak bo'ladi
}

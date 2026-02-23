use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Kitob topshirish uchun so'rov
#[derive(Debug, Deserialize)]
pub struct CreateRentalRequest {
    pub user_id: String,
    pub book_id: String,
    pub due_date: String, // "YYYY-MM-DD" formatida
    pub notes: Option<String>,
}

/// Kitobni qaytarish uchun so'rov
#[derive(Debug, Deserialize)]
pub struct ReturnRentalRequest {
    pub notes: Option<String>,
}

/// Ijaralar uchun filtr parametrlari
#[derive(Debug, Deserialize)]
pub struct RentalFilterParams {
    pub status: Option<String>,
    pub user_id: Option<String>,
}

/// Bitta ijara javobi (kitob va foydalanuvchi ma'lumotlari bilan)
#[derive(Debug, Serialize)]
pub struct RentalResponse {
    pub id: Uuid,
    pub user_id: String,
    pub book_id: String,
    pub loan_date: String,
    pub due_date: String,
    pub return_date: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    // Kitob ma'lumotlari
    pub book_title: Option<String>,
    pub book_author: Option<String>,
    pub book_cover: Option<String>,
    // Foydalanuvchi ma'lumotlari
    pub user_full_name: Option<String>,
    pub role: Option<String>,
    pub department_name: Option<String>,
    pub group_name: Option<String>,
    pub staff_position: Option<String>,
}

/// Ijaralar ro'yxati javobi
#[derive(Debug, Serialize)]
pub struct RentalListResponse {
    pub success: bool,
    pub data: Vec<RentalResponse>,
    pub total: usize,
}

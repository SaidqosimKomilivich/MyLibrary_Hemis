use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Kitob topshirish uchun so'rov
#[derive(Debug, Deserialize)]
pub struct CreateRentalRequest {
    pub user_id: String,
    pub book_id: String,
    pub due_date: String, // "YYYY-MM-DD" formatida
    pub invoice_number: String, // Kitobning fizik nusxasiga berilgan unikal invois raqami
    pub notes: Option<String>,
}

/// Bir nechta kitob topshirish uchun element
#[derive(Debug, Deserialize)]
pub struct CreateRentalItem {
    pub book_id: String,
    pub invoice_number: String,
    pub due_date: Option<String>,
    pub notes: Option<String>,
}

/// Bir nechta kitob topshirish (batch) so'rovi
#[derive(Debug, Deserialize)]
pub struct CreateRentalBatchRequest {
    pub user_id: String,
    pub due_date: Option<String>, // Umumiy qaytarish muddati
    pub notes: Option<String>,
    pub items: Vec<CreateRentalItem>,
}

/// Bir nechta kitob topshirish javobi
#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct CreateRentalBatchResponse {
    pub success: bool,
    pub message: String,
    pub count: usize,
    pub ids: Vec<Uuid>,
}

/// Kitobni qaytarish uchun so'rov
#[derive(Debug, Deserialize)]
pub struct ReturnRentalRequest {
    pub notes: Option<String>,
}

/// Bir nechta kitobni qaytarish uchun element
#[derive(Debug, Deserialize)]
pub struct ReturnRentalItem {
    pub rental_id: Uuid,
    pub notes: Option<String>,
}

/// Bir nechta kitobni qaytarish (batch) so'rovi
#[derive(Debug, Deserialize)]
pub struct ReturnRentalBatchRequest {
    pub notes: Option<String>, // Umumiy izoh
    pub items: Vec<ReturnRentalItem>,
}

/// Bir nechta kitobni qaytarish javobi
#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct ReturnRentalBatchResponse {
    pub success: bool,
    pub message: String,
    pub count: usize,
    pub returned_ids: Vec<Uuid>,
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
    pub invoice_number: Option<String>, // Kitobning fizik nusxasiga berilgan unikal invois raqami
    pub notes: Option<String>,
    pub issued_by_user_id: Option<String>,
    // Kitob ma'lumotlari
    pub book_title: Option<String>,
    pub book_author: Option<String>,
    pub book_cover: Option<String>,
    // Foydalanuvchi ma'lumotlari
    pub user_full_name: Option<String>,
    pub role: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
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

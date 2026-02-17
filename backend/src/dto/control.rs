use serde::Serialize;
use uuid::Uuid;

/// Nazorat yozuvi javobi (formatlangan vaqtlar bilan)
#[derive(Debug, Serialize)]
pub struct ControlResponse {
    pub id: Uuid,
    pub user_id: String,
    pub arrival: Option<String>,
    pub departure: Option<String>,
}

/// Nazorat yozuvlari ro'yxati
#[derive(Debug, Serialize)]
pub struct ControlListResponse {
    pub success: bool,
    pub data: Vec<ControlResponse>,
    pub total: usize,
}

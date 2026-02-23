use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ControlRequest {
    pub user_id: Option<String>,
}

/// Nazorat yozuvi javobi (formatlangan vaqtlar bilan)
#[derive(Debug, Serialize)]
pub struct ControlResponse {
    pub id: Uuid,
    pub user_id: String,
    pub arrival: Option<String>,
    pub departure: Option<String>,
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub department_name: Option<String>,
    pub group_name: Option<String>,
    pub staff_position: Option<String>,
}

/// Nazorat yozuvlari ro'yxati
#[derive(Debug, Serialize)]
pub struct ControlListResponse {
    pub success: bool,
    pub data: Vec<ControlResponse>,
    pub total: usize,
}

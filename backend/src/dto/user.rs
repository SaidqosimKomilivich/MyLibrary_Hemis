use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::user::User;

#[derive(Debug, Clone, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub user_id: String,
    pub role: String,
    pub full_name: String,
    pub short_name: Option<String>,
    pub birth_date: Option<NaiveDate>,
    pub image_url: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub id_card: i64,
    pub department_name: Option<String>,
    pub specialty_name: Option<String>,
    pub group_name: Option<String>,
    pub education_form: Option<String>,
    pub staff_position: Option<String>,
    pub active: bool,
    pub is_password_update: bool,
    pub is_super_admin: Option<bool>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        UserResponse {
            id: user.id,
            user_id: user.user_id,
            role: user.role,
            full_name: user.full_name,
            short_name: user.short_name,
            birth_date: user.birth_date,
            image_url: user.image_url,
            email: user.email,
            phone: user.phone,
            id_card: user.id_card,
            department_name: user.department_name,
            specialty_name: user.specialty_name,
            group_name: user.group_name,
            education_form: user.education_form,
            staff_position: user.staff_position,
            active: user.active,
            is_password_update: user.is_password_update,
            is_super_admin: None,
        }
    }
}

/// Foydalanuvchilar uchun paginatsiya query parametrlari
#[derive(Debug, Deserialize)]
pub struct UserPaginationParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

/// Paginatsiyali foydalanuvchilar javobi
#[derive(Debug, Serialize)]
pub struct PaginatedUsersResponse {
    pub success: bool,
    pub data: Vec<UserResponse>,
    pub pagination: UserPaginationInfo,
}

#[derive(Debug, Serialize)]
pub struct UserPaginationInfo {
    pub current_page: i64,
    pub per_page: i64,
    pub total_items: i64,
    pub total_pages: i64,
}

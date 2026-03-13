use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub user_id: String,
    pub password: String,
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
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
    pub hemis_token: Option<String>,
    pub hemis_token_expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub active: bool,
    pub is_password_update: bool,
}

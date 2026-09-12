use super::user::UserResponse;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub user_id: String,
    pub password: String,
    pub captcha_id: Option<String>,
    pub captcha_value: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub old_password: String,
    pub new_password: String,
    pub email: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContactsRequest {
    pub email: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CaptchaResponse {
    pub success: bool,
    pub captcha_id: String,
    pub image: String,  // base64 SVG: "data:image/svg+xml;base64,..." — text emas, rasm
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub message: String,
    pub user: UserResponse,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct UnblockRequest {
    pub user_id: Option<String>,
    pub ip: Option<String>,
    pub clear_all: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct BlockedItem {
    pub target: String,
    pub blocked_until: i64,
}

#[derive(Debug, Serialize)]
pub struct BlockedSummaryResponse {
    pub success: bool,
    pub users: Vec<BlockedItem>,
    pub ips: Vec<BlockedItem>,
}

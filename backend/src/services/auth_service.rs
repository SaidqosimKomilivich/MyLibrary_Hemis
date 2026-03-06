use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::Config;
use crate::dto::auth::{LoginRequest, LoginResponse, MessageResponse};
use crate::dto::user::UserResponse;
use crate::errors::AppError;
use crate::repository::token_repository::TokenRepository;
use crate::repository::user_repository::UserRepository;

/// JWT token ichidagi ma'lumotlar
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,        // user UUID
    pub role: String,       // user role
    pub exp: usize,         // expiry timestamp
    pub iat: usize,         // issued at
    pub token_type: String, // "access" yoki "refresh"
}

pub struct AuthService;

impl AuthService {
    // ========================
    // Parol bilan ishlash (Argon2)
    // ========================

    /// Parolni Argon2 bilan heshlash
    pub fn hash_password(password: &str) -> Result<String, AppError> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AppError::InternalError(format!("Parol heshlashda xatolik: {}", e)))?;
        Ok(password_hash.to_string())
    }

    /// Parolni kamida 8 ta belgi, katta-kichik harf, raqam va maxsus belgi ekanligini tekshirish
    pub fn validate_password_complexity(password: &str) -> Result<(), AppError> {
        if password.len() < 8 {
            return Err(AppError::BadRequest(
                "Parol kamida 8 ta belgidan iborat bo'lishi kerak".to_string(),
            ));
        }
        let has_upper = password.chars().any(|c| c.is_uppercase());
        let has_lower = password.chars().any(|c| c.is_lowercase());
        let has_digit = password.chars().any(|c| c.is_numeric());
        let has_special = password.chars().any(|c| !c.is_alphanumeric());

        if !has_upper || !has_lower || !has_digit || !has_special {
            return Err(AppError::BadRequest(
                "Parolda kamida bitta katta harf, bitta kichik harf, bitta raqam va bitta maxsus belgi bo'lishi kerak".to_string()
            ));
        }

        Ok(())
    }

    /// Parolni tekshirish
    pub fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
        let parsed_hash = PasswordHash::new(hash)
            .map_err(|e| AppError::InternalError(format!("Hesh noto'g'ri formatda: {}", e)))?;
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }

    // ========================
    // JWT token bilan ishlash
    // ========================

    /// Access token yaratish (80 daqiqa)
    pub fn generate_access_token(
        user_id: Uuid,
        role: &str,
        config: &Config,
    ) -> Result<String, AppError> {
        let now = Utc::now();
        let exp = now + Duration::minutes(config.access_token_expiry_minutes);

        let claims = Claims {
            sub: user_id.to_string(),
            role: role.to_string(),
            exp: exp.timestamp() as usize,
            iat: now.timestamp() as usize,
            token_type: "access".to_string(),
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
        )?;

        Ok(token)
    }

    /// Refresh token yaratish (7 kun)
    pub fn generate_refresh_token(
        user_id: Uuid,
        role: &str,
        config: &Config,
    ) -> Result<String, AppError> {
        let now = Utc::now();
        let exp = now + Duration::days(config.refresh_token_expiry_days);

        let claims = Claims {
            sub: user_id.to_string(),
            role: role.to_string(),
            exp: exp.timestamp() as usize,
            iat: now.timestamp() as usize,
            token_type: "refresh".to_string(),
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
        )?;

        Ok(token)
    }

    /// Tokenni tekshirish va Claims qaytarish
    pub fn validate_token(token: &str, config: &Config) -> Result<Claims, AppError> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
            &Validation::default(),
        )?;

        Ok(token_data.claims)
    }

    // ========================
    // Asosiy biznes logikasi
    // ========================

    /// Tizimga kirish (Login)
    pub async fn login(
        pool: &PgPool,
        config: &Config,
        req: LoginRequest,
        user_agent: Option<String>,
        client_ip: Option<String>,
    ) -> Result<(LoginResponse, String, String), AppError> {
        // 1. Foydalanuvchini topish
        let user = UserRepository::find_by_user_id(pool, &req.user_id)
            .await?
            .ok_or_else(|| AppError::Unauthorized("Login yoki parol noto'g'ri".to_string()))?;

        // 2. Parolni tekshirish
        let is_valid = Self::verify_password(&req.password, &user.password)?;
        if !is_valid {
            return Err(AppError::Unauthorized(
                "Login yoki parol noto'g'ri".to_string(),
            ));
        }

        // 3. Access va Refresh tokenlarni yaratish
        let access_token = Self::generate_access_token(user.id, &user.role, config)?;
        let refresh_token = Self::generate_refresh_token(user.id, &user.role, config)?;

        // 4. Refresh tokenni bazaga saqlash
        let expires_at = Utc::now() + Duration::days(config.refresh_token_expiry_days);
        TokenRepository::save(
            pool,
            user.id,
            &refresh_token,
            expires_at,
            user_agent.as_deref(),
            client_ip.as_deref(),
        )
        .await?;

        tracing::info!(user_id = %user.user_id, role = %user.role, "Foydalanuvchi tizimga kirdi");

        let is_super_admin = user.role == "admin" && user.user_id == config.admin_login;
        let mut user_response = UserResponse::from(user);
        user_response.is_super_admin = Some(is_super_admin);

        let response = LoginResponse {
            success: true,
            message: "Muvaffaqiyatli kirdingiz".to_string(),
            user: user_response,
        };

        Ok((response, access_token, refresh_token))
    }

    /// Tizimdan chiqish (Logout)
    pub async fn logout(
        pool: &PgPool,
        config: &Config,
        refresh_token_str: Option<&str>,
    ) -> Result<MessageResponse, AppError> {
        if let Some(token_str) = refresh_token_str {
            // Token validmi tekshiramiz (muddati o'tgan bo'lsa ham revoke qilamiz)
            if let Ok(claims) = Self::validate_token(token_str, config) {
                if let Ok(user_id) = Uuid::parse_str(&claims.sub) {
                    // Faqat shu tokenni revoke qilamiz
                    if let Some(token) = TokenRepository::find_by_token(pool, token_str).await? {
                        TokenRepository::revoke(pool, token.id).await?;
                    }
                    tracing::info!(user_id = %user_id, "Foydalanuvchi tizimdan chiqdi");
                }
            } else {
                // Token yaroqsiz bo'lsa ham, bazadan topib revoke qilamiz
                if let Some(token) = TokenRepository::find_by_token(pool, token_str).await? {
                    TokenRepository::revoke(pool, token.id).await?;
                }
            }
        }

        Ok(MessageResponse {
            success: true,
            message: "Muvaffaqiyatli chiqdingiz".to_string(),
        })
    }

    /// Tokenlarni yangilash (Refresh Token Rotation)
    pub async fn refresh_tokens(
        pool: &PgPool,
        config: &Config,
        old_refresh_token: &str,
        user_agent: Option<String>,
        client_ip: Option<String>,
    ) -> Result<(String, String), AppError> {
        // 1. Eski refresh tokenni tekshirish
        let claims = Self::validate_token(old_refresh_token, config)
            .map_err(|_| AppError::Unauthorized("Refresh token yaroqsiz".to_string()))?;

        if claims.token_type != "refresh" {
            return Err(AppError::Unauthorized("Noto'g'ri token turi".to_string()));
        }

        // 2. Bazadan tokenni topish
        let old_token = TokenRepository::find_by_token(pool, old_refresh_token)
            .await?
            .ok_or_else(|| {
                AppError::Unauthorized("Refresh token topilmadi yoki bekor qilingan".to_string())
            })?;

        // 3. Muddati o'tganligini tekshirish
        if old_token.expires_at < Utc::now() {
            TokenRepository::revoke(pool, old_token.id).await?;
            return Err(AppError::Unauthorized(
                "Refresh token muddati o'tgan".to_string(),
            ));
        }

        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| AppError::InternalError("UUID noto'g'ri".to_string()))?;

        // 4. Yangi tokenlar yaratish
        let new_access_token = Self::generate_access_token(user_id, &claims.role, config)?;
        let new_refresh_token = Self::generate_refresh_token(user_id, &claims.role, config)?;

        // 5. Eski tokenni bekor qilish va yangi token bilan almashtirish
        TokenRepository::replace_token(pool, old_token.id, &new_refresh_token).await?;

        // 6. Yangi refresh tokenni bazaga saqlash
        let expires_at = Utc::now() + Duration::days(config.refresh_token_expiry_days);
        TokenRepository::save(
            pool,
            user_id,
            &new_refresh_token,
            expires_at,
            user_agent.as_deref(),
            client_ip.as_deref(),
        )
        .await?;

        tracing::info!(user_id = %user_id, "Tokenlar yangilandi");

        Ok((new_access_token, new_refresh_token))
    }

    /// Joriy foydalanuvchi ma'lumotlarini olish
    pub async fn get_current_user(
        pool: &PgPool,
        config: &Config,
        user_id: Uuid,
    ) -> Result<UserResponse, AppError> {
        let user = UserRepository::find_by_id(pool, user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Foydalanuvchi topilmadi".to_string()))?;

        let is_super_admin = user.role == "admin" && user.user_id == config.admin_login;
        let mut user_response = UserResponse::from(user);
        user_response.is_super_admin = Some(is_super_admin);

        Ok(user_response)
    }

    pub async fn change_password(
        pool: &PgPool,
        user_id: Uuid,
        old_password: &str,
        new_password: &str,
        email: Option<&str>,
        phone: Option<&str>,
    ) -> Result<MessageResponse, AppError> {
        Self::validate_password_complexity(new_password)?;

        // 1. Foydalanuvchini topish
        let user = UserRepository::find_by_id(pool, user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Foydalanuvchi topilmadi".to_string()))?;

        // 2. Eski parolni tekshirish
        let is_valid = Self::verify_password(old_password, &user.password)?;
        if !is_valid {
            return Err(AppError::BadRequest("Joriy parol noto'g'ri".to_string()));
        }

        // 3. Yangi parolni heshlash va saqlash (va agar ixtiyoriy kontaklar e/p berilgan bo'lsa)
        let new_hash = Self::hash_password(new_password)?;
        if email.is_some() || phone.is_some() {
            UserRepository::update_password_and_contacts(pool, user_id, &new_hash, email, phone)
                .await?;
        } else {
            UserRepository::update_password(pool, user_id, &new_hash).await?;
        }

        tracing::info!(user_id = %user.user_id, "Parol o'zgartirildi");

        Ok(MessageResponse {
            success: true,
            message: "Parol muvaffaqiyatli o'zgartirildi".to_string(),
        })
    }
}

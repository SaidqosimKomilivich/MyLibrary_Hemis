use crate::config::Config;
use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHasher,
};
use chrono::NaiveDate;
use sqlx::{Pool, Postgres};
use tracing::{error, info, warn};

use crate::models::user::User;

pub async fn seed_admin(pool: &Pool<Postgres>) -> Result<(), String> {
    let config = Config::from_env();

    let login = &config.admin_login;
    let password = &config.admin_parol;
    let full_name = &config.admin_name;

    // Bazada admin bor-yo'qligini tekshirish
    let exists = sqlx::query_as::<_, User>(r#"SELECT * FROM "users" WHERE "user_id" = $1"#)
        .bind(login)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            error!("❌ Ma'lumotlar bazasiga ulanishda xatolik: {}", e);
            format!("Database error: {}", e)
        })?;

    if exists.is_some() {
        warn!("ℹ️  Admin ('{}') allaqachon mavjud.", login);
        return Ok(());
    }

    info!("⚙️  Yangi Admin ('{}') yaratilmoqda...", login);

    // Parolni xeshlash
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| {
            error!("❌ Parolni xeshlashda xatolik: {}", e);
            format!("Password hashing error: {}", e)
        })?
        .to_string();

    // Admin uchun default birth_date (masalan 1980-01-01)
    let default_birth_date = NaiveDate::from_ymd_opt(1980, 1, 1)
        .ok_or_else(|| "Invalid default birth date".to_string())?;

    // Admin yaratish
    sqlx::query(
        r#"
        INSERT INTO "users" ("user_id", "full_name", "password", "role", "birth_date") 
        VALUES ($1, $2, $3, 'admin', $4)
        "#,
    )
    .bind(login)
    .bind(full_name)
    .bind(&password_hash)
    .bind(default_birth_date)
    .execute(pool)
    .await
    .map_err(|e| {
        error!("❌ Adminni yaratishda xatolik: {}", e);
        format!("Failed to create admin: {}", e)
    })?;

    info!("✅ Muvaffaqiyat! Admin yaratildi. Login: {}", login);
    Ok(())
}

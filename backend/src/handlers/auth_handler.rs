use actix_web::{
    cookie::{time::Duration as CookieDuration, Cookie, SameSite},
    web, HttpRequest, HttpResponse,
};
use chrono::Utc;
use sqlx::PgPool;

use crate::config::Config;
use crate::dto::auth::{
    BlockedItem, BlockedSummaryResponse, CaptchaResponse, ChangePasswordRequest, LoginRequest,
    UnblockRequest,
};
use crate::errors::AppError;
use crate::middleware::auth_middleware::require_role;
use crate::middleware::auth_middleware::Claims;
use crate::repository::user_repository::UserRepository;
use crate::services::auth_service::AuthService;
use crate::services::captcha_service::CaptchaService;

/// Clientning haqiqiy IP manzilini olish (Reverse Proxy / Cloudflare orqasidan)
fn get_client_ip(req: &HttpRequest) -> Option<String> {
    // 1. Cloudflare IP header
    if let Some(cf_ip) = req.headers().get("CF-Connecting-IP") {
        if let Ok(ip_str) = cf_ip.to_str() {
            let clean = ip_str.trim();
            if !clean.is_empty() {
                return Some(clean.to_string());
            }
        }
    }

    // 2. X-Forwarded-For (proksilar zanjirida mijoz IPsi birinchi bo'ladi: client, proxy1, proxy2)
    if let Some(forwarded) = req.headers().get("X-Forwarded-For") {
        if let Ok(forwarded_str) = forwarded.to_str() {
            if let Some(first_ip) = forwarded_str.split(',').next() {
                let clean = first_ip.trim();
                if !clean.is_empty() {
                    return Some(clean.to_string());
                }
            }
        }
    }

    // 3. X-Real-IP
    if let Some(real_ip) = req.headers().get("X-Real-IP") {
        if let Ok(ip_str) = real_ip.to_str() {
            let clean = ip_str.trim();
            if !clean.is_empty() {
                return Some(clean.to_string());
            }
        }
    }

    // 4. Actix-web connection_info() orqali tekshirish
    let conn_ip = req.connection_info().realip_remote_addr().map(|s| s.to_string());
    if let Some(ip) = conn_ip {
        if !ip.is_empty() {
            return Some(ip);
        }
    }

    // 5. Fallback: to'g'ridan-to'g'ri peer_addr
    req.peer_addr().map(|addr| addr.ip().to_string())
}

/// Qolgan blok vaqtini daqiqada hisoblab, xabar shakllantirish
fn format_block_message(expires_str: &str, entity_name: &str) -> String {
    if let Ok(expires_ts) = expires_str.parse::<i64>() {
        let now = Utc::now().timestamp();
        let remaining_secs = (expires_ts - now).max(0);
        let remaining_mins = (remaining_secs + 59) / 60;
        format!(
            "{} juda ko'p muvaffaqiyatsiz urinishlar tufayli vaqtinchalik bloklangan. Qolgan vaqt: {} daqiqa.",
            entity_name, remaining_mins
        )
    } else {
        format!(
            "{} vaqtinchalik bloklangan. Iltimos keyinroq qayta urinib ko'ring.",
            entity_name
        )
    }
}

/// User-Agent header'ini olish
fn get_user_agent(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get("User-Agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// Access token uchun cookie yaratish
fn create_access_cookie(token: &str, max_age_minutes: i64) -> Cookie<'static> {
    Cookie::build("access_token", token.to_string())
        .path("/")
        .http_only(true)
        .secure(true)                  // HTTPS orqali yuboriladi
        .same_site(SameSite::None)     // Cross-origin domenlar uchun (lib.jbnuu.uz → apilib.jbnuu.uz)
        .max_age(CookieDuration::minutes(max_age_minutes))
        .finish()
}

/// Refresh token uchun cookie yaratish
fn create_refresh_cookie(token: &str, max_age_days: i64) -> Cookie<'static> {
    Cookie::build("refresh_token", token.to_string())
        .path("/api/auth")
        .http_only(true)
        .secure(true)                  // HTTPS orqali yuboriladi
        .same_site(SameSite::None)     // Cross-origin domenlar uchun (lib.jbnuu.uz → apilib.jbnuu.uz)
        .max_age(CookieDuration::days(max_age_days))
        .finish()
}

/// Cookie'ni o'chirish uchun bo'sh cookie yaratish
fn create_removal_cookie(name: &str, path: &str) -> Cookie<'static> {
    Cookie::build(name.to_string(), "".to_string())
        .path(path.to_string())
        .http_only(true)
        .secure(true)                  // HTTPS orqali yuboriladi
        .same_site(SameSite::None)     // Cross-origin domenlar uchun (lib.jbnuu.uz → apilib.jbnuu.uz)
        .max_age(CookieDuration::ZERO)
        .finish()
}

// ================================
// Handlers
// ================================

/// GET /api/auth/captcha
pub async fn get_captcha() -> Result<HttpResponse, AppError> {
    let (captcha_id, image) = CaptchaService::generate_captcha();
    Ok(HttpResponse::Ok().json(CaptchaResponse {
        success: true,
        captcha_id,
        image,  // base64 SVG — matematik misol matni emas
    }))
}

/// POST /api/auth/login
pub async fn login(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    req: HttpRequest,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    let user_id = body.user_id.trim().to_string();
    let client_ip = get_client_ip(&req).unwrap_or_else(|| "unknown".to_string());

    // 0. IP bo'yicha rate limiting — distributed brute-force'dan himoya
    if let Err(expires_str) = CaptchaService::check_ip_rate_limit(&client_ip) {
        let msg = format_block_message(&expires_str, "Ushbu IP manzil");
        return Ok(HttpResponse::TooManyRequests().json(serde_json::json!({
            "success": false,
            "message": msg,
            "blocked_until": expires_str
        })));
    }

    // 1. Rate Limiting Check (user_id bo'yicha)
    if let Err(expires_str) = CaptchaService::check_rate_limit(&user_id) {
        let msg = format_block_message(&expires_str, "Akkauntingiz");
        return Ok(HttpResponse::TooManyRequests().json(serde_json::json!({
            "success": false,
            "message": msg,
            "blocked_until": expires_str
        })));
    }

    // 2. Captcha verification
    let captcha_id = body.captcha_id.clone().unwrap_or_default();
    let captcha_value = body.captcha_value.unwrap_or(-1);
    
    if let Err(e) = CaptchaService::validate_captcha(&captcha_id, captcha_value) {
        // DIQQAT: Captcha noto'g'ri kiritilishi insoniy xato bo'lishi mumkin.
        // Captcha xatosi brute-force urinish hisoblagichiga qo'shilmaydi!
        // Shunchaki xatolik qaytariladi va frontend yangi captcha so'raydi.
        return Err(e);
    }

    let user_agent = get_user_agent(&req);

    // 3. Authenticate
    match AuthService::login(
        pool.get_ref(),
        config.get_ref(),
        body.into_inner(),
        user_agent,
        Some(client_ip.clone()),
    ).await {
        Ok((response, access_token, refresh_token)) => {
            // Muvaffaqiyat: barcha muvaffaqiyatsiz urinishlarni tozalash
            CaptchaService::clear_attempts(&user_id);
            CaptchaService::clear_ip_attempts(&client_ip);

            let access_cookie = create_access_cookie(&access_token, config.access_token_expiry_minutes);
            let refresh_cookie = create_refresh_cookie(&refresh_token, config.refresh_token_expiry_days);

            Ok(HttpResponse::Ok()
                .cookie(access_cookie)
                .cookie(refresh_cookie)
                .json(response))
        },
        Err(e) => {
            // Faqatgina 401 Unauthorized (parol yoki login haqiqatan noto'g'ri bo'lgan) holatda
            // hisoblagich oshiriladi. Server xatosi yoki HEMIS cheklovlarida foydalanuvchi ayblanmaydi!
            if matches!(e, AppError::Unauthorized(_)) {
                CaptchaService::record_failed_attempt(&user_id);
                CaptchaService::record_ip_attempt(&client_ip);
            }
            Err(e)
        }
    }
}

/// POST /api/auth/logout
pub async fn logout(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let refresh_token = req.cookie("refresh_token").map(|c| c.value().to_string());

    let response =
        AuthService::logout(pool.get_ref(), config.get_ref(), refresh_token.as_deref()).await?;

    Ok(HttpResponse::Ok()
        .cookie(create_removal_cookie("access_token", "/"))
        .cookie(create_removal_cookie("refresh_token", "/api/auth"))
        .json(response))
}

/// POST /api/auth/refresh
pub async fn refresh(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let refresh_token_str = req
        .cookie("refresh_token")
        .map(|c| c.value().to_string())
        .ok_or_else(|| AppError::Unauthorized("Refresh token topilmadi".to_string()))?;

    let user_agent = get_user_agent(&req);
    let client_ip = get_client_ip(&req);

    let (new_access, new_refresh) = AuthService::refresh_tokens(
        pool.get_ref(),
        config.get_ref(),
        &refresh_token_str,
        user_agent,
        client_ip,
    )
    .await?;

    let access_cookie = create_access_cookie(&new_access, config.access_token_expiry_minutes);
    let refresh_cookie = create_refresh_cookie(&new_refresh, config.refresh_token_expiry_days);

    Ok(HttpResponse::Ok()
        .cookie(access_cookie)
        .cookie(refresh_cookie)
        .json(serde_json::json!({
            "success": true,
            "message": "Tokenlar yangilandi"
        })))
}

pub async fn me(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::InternalError("UUID noto'g'ri".to_string()))?;

    let user = AuthService::get_current_user(pool.get_ref(), config.get_ref(), user_id).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "user": user
    })))
}

/// POST /api/auth/change-password
pub async fn change_password(
    pool: web::Data<PgPool>,
    claims: Claims,
    body: web::Json<ChangePasswordRequest>,
) -> Result<HttpResponse, AppError> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::InternalError("UUID noto'g'ri".to_string()))?;

    // XAVFSIZLIK: Talabalar uchun parolni o'zgartirish cheklangan
    if claims.role == "student" {
        return Err(AppError::Forbidden("Talabalar uchun parolni o'zgartirish ruxsat etilmagan".to_string()));
    }

    let response = AuthService::change_password(
        pool.get_ref(),
        user_id,
        &body.old_password,
        &body.new_password,
        body.email.as_deref(),
        body.phone.as_deref(),
    )
    .await?;

    Ok(HttpResponse::Ok().json(response))
}

/// POST /api/auth/update-contacts
pub async fn update_contacts(
    pool: web::Data<PgPool>,
    claims: Claims,
    body: web::Json<crate::dto::auth::UpdateContactsRequest>,
) -> Result<HttpResponse, AppError> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::InternalError("UUID noto'g'ri".to_string()))?;

    let response = AuthService::update_contacts(
        pool.get_ref(),
        user_id,
        body.email.as_deref(),
        body.phone.as_deref(),
    )
    .await?;

    Ok(HttpResponse::Ok().json(response))
}

/// POST /api/auth/reset-password/{user_id}
/// Faqat admin: foydalanuvchi parolini default holatga qaytarish
pub async fn reset_password(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<String>,
) -> Result<HttpResponse, actix_web::Error> {
    // Faqat admin uchun
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    let target_id = uuid::Uuid::parse_str(&path.into_inner())
        .map_err(|_| actix_web::error::ErrorBadRequest("Noto'g'ri UUID"))?;

    // Foydalanuvchini topish
    let user = UserRepository::find_by_id_any(pool.get_ref(), target_id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound("Foydalanuvchi topilmadi"))?;

    // Default parol = user_id
    let default_hash = AuthService::hash_password(&user.user_id)
        .map_err(actix_web::error::ErrorInternalServerError)?;

    UserRepository::reset_password(pool.get_ref(), target_id, &default_hash)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    tracing::info!(target_user = %user.user_id, admin = %claims.sub, "Parol default holatga qaytarildi");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Parol muvaffaqiyatli default holatga qaytarildi"
    })))
}

/// POST /api/users/increment-id-card
/// Foydalanuvchi ID kartasining old tomonini yuklab olganida id_card hisoblagichini oshiradi
pub async fn increment_id_card(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    use crate::repository::user_repository::UserRepository;

    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::InternalError("UUID noto'g'ri".to_string()))?;

    UserRepository::increment_id_card_download(pool.get_ref(), user_id).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "ID karta yuklab olish soni yangilandi"
    })))
}

/// POST /api/auth/unblock
/// Faqat admin uchun: bloklangan akkaunt yoki IP manzilni blokdan chiqarish
pub async fn unblock(
    claims: Claims,
    body: web::Json<UnblockRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    if body.clear_all.unwrap_or(false) {
        let (users, ips) = CaptchaService::clear_all_blocks();
        tracing::info!(admin = %claims.sub, users, ips, "Admin barcha bloklarni tozaladi");
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": format!("Barcha bloklar tozalandi. Foydalanuvchilar: {}, IP manzillar: {}", users, ips)
        })));
    }

    let mut unblocked_items = Vec::new();

    if let Some(ref uid) = body.user_id {
        let clean_uid = uid.trim();
        if !clean_uid.is_empty() {
            CaptchaService::clear_attempts(clean_uid);
            unblocked_items.push(format!("User: {}", clean_uid));
        }
    }

    if let Some(ref ip) = body.ip {
        let clean_ip = ip.trim();
        if !clean_ip.is_empty() {
            CaptchaService::clear_ip_attempts(clean_ip);
            unblocked_items.push(format!("IP: {}", clean_ip));
        }
    }

    if unblocked_items.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "message": "user_id, ip yoki clear_all parametrlaridan biri berilishi shart"
        })));
    }

    tracing::info!(admin = %claims.sub, items = ?unblocked_items, "Admin blokdan chiqardi");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": format!("Muvaffaqiyatli blokdan chiqarildi: {}", unblocked_items.join(", "))
    })))
}

/// GET /api/auth/blocked-list
/// Faqat admin uchun: hozirgi bloklangan foydalanuvchilar va IP manzillar ro'yxati
pub async fn get_blocked_list(
    claims: Claims,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    let (users_raw, ips_raw) = CaptchaService::get_blocked_summary();

    let users = users_raw
        .into_iter()
        .map(|(target, blocked_until)| BlockedItem { target, blocked_until })
        .collect();

    let ips = ips_raw
        .into_iter()
        .map(|(target, blocked_until)| BlockedItem { target, blocked_until })
        .collect();

    Ok(HttpResponse::Ok().json(BlockedSummaryResponse {
        success: true,
        users,
        ips,
    }))
}


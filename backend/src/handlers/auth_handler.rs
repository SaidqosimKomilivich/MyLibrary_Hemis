use actix_web::{cookie::{Cookie, SameSite, time::Duration as CookieDuration}, web, HttpRequest, HttpResponse};
use sqlx::PgPool;

use crate::config::Config;
use crate::dto::auth::{LoginRequest, ChangePasswordRequest};
use crate::errors::AppError;
use crate::middleware::auth_middleware::Claims;
use crate::services::auth_service::AuthService;

/// Clientning IP manzilini olish
fn get_client_ip(req: &HttpRequest) -> Option<String> {
    req.peer_addr().map(|addr| addr.ip().to_string())
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
        .same_site(SameSite::Lax)
        .max_age(CookieDuration::minutes(max_age_minutes))
        .finish()
}

/// Refresh token uchun cookie yaratish
fn create_refresh_cookie(token: &str, max_age_days: i64) -> Cookie<'static> {
    Cookie::build("refresh_token", token.to_string())
        .path("/api/auth")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(CookieDuration::days(max_age_days))
        .finish()
}

/// Cookie'ni o'chirish uchun bo'sh cookie yaratish
fn create_removal_cookie(name: &str, path: &str) -> Cookie<'static> {
    Cookie::build(name.to_string(), "".to_string())
        .path(path.to_string())
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(CookieDuration::ZERO)
        .finish()
}

// ================================
// Handlers
// ================================

/// POST /api/auth/login
pub async fn login(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    req: HttpRequest,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    let user_agent = get_user_agent(&req);
    let client_ip = get_client_ip(&req);

    let (response, access_token, refresh_token) =
        AuthService::login(pool.get_ref(), config.get_ref(), body.into_inner(), user_agent, client_ip).await?;

    let access_cookie = create_access_cookie(&access_token, config.access_token_expiry_minutes);
    let refresh_cookie = create_refresh_cookie(&refresh_token, config.refresh_token_expiry_days);

    Ok(HttpResponse::Ok()
        .cookie(access_cookie)
        .cookie(refresh_cookie)
        .json(response))
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

/// GET /api/auth/me
pub async fn me(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::InternalError("UUID noto'g'ri".to_string()))?;

    let user = AuthService::get_current_user(pool.get_ref(), user_id).await?;

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

    let response = AuthService::change_password(
        pool.get_ref(),
        user_id,
        &body.old_password,
        &body.new_password,
    ).await?;

    Ok(HttpResponse::Ok().json(response))
}

use actix_files::NamedFile;
use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use serde::Deserialize;
use sqlx::PgPool;

use crate::config::Config;
use crate::dto::admin_log::SystemLogQuery;
use crate::middleware::auth_middleware::Claims;
use crate::repository::user_repository::UserRepository;
use crate::services::admin_log_service::AdminLogService;

/// Faqat va faqat Super Admin (Bosh Administrator) ekanligini tekshirish
/// Boshqa oddiy adminlarga ruxsat berilmaydi (403 Forbidden qaytariladi)
async fn require_super_admin(
    claims: &Claims,
    pool: &PgPool,
    config: &Config,
) -> Result<(), HttpResponse> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| HttpResponse::Unauthorized().json(serde_json::json!({
            "error": true,
            "message": "Avtorizatsiya talab qilinadi"
        })))?;

    let user = UserRepository::find_by_id(pool, user_id)
        .await
        .map_err(|e| HttpResponse::InternalServerError().json(serde_json::json!({
            "error": true,
            "message": format!("Foydalanuvchi ma'lumotlarini olishda xatolik: {}", e)
        })))?
        .ok_or_else(|| HttpResponse::Unauthorized().json(serde_json::json!({
            "error": true,
            "message": "Foydalanuvchi topilmadi"
        })))?;

    let is_super = user.role == "admin"
        && (user.user_id == config.admin_login
            || user.user_id == "admin"
            || user.user_id == "superadmin");

    if !is_super {
        return Err(HttpResponse::Forbidden().json(serde_json::json!({
            "error": true,
            "message": "Ushbu bo'limga kirish faqat Super Admin (Bosh Administrator) uchun ruxsat etilgan. Boshqa adminlar bu ma'lumotlarni ko'ra olmaydi."
        })));
    }

    Ok(())
}

/// Tizim loglarini olish va filtrlash (faqat Super Admin)
pub async fn get_logs(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    query: web::Query<SystemLogQuery>,
) -> HttpResponse {
    let claims = match req.extensions().get::<Claims>().cloned() {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(serde_json::json!({
            "error": true,
            "message": "Avtorizatsiya talab qilinadi"
        })),
    };

    if let Err(resp) = require_super_admin(&claims, pool.get_ref(), config.get_ref()).await {
        return resp;
    }

    match AdminLogService::get_logs(query.into_inner()) {
        Ok(res) => HttpResponse::Ok().json(res),
        Err(e) => HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": e.to_string()
        })),
    }
}

/// Mavjud log fayllari ro'yxatini olish (faqat Super Admin)
pub async fn get_log_files(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
) -> HttpResponse {
    let claims = match req.extensions().get::<Claims>().cloned() {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(serde_json::json!({
            "error": true,
            "message": "Avtorizatsiya talab qilinadi"
        })),
    };

    if let Err(resp) = require_super_admin(&claims, pool.get_ref(), config.get_ref()).await {
        return resp;
    }

    let files = AdminLogService::list_log_files();
    HttpResponse::Ok().json(files)
}

#[derive(Debug, Deserialize)]
pub struct DownloadLogQuery {
    pub file: String,
}

/// Log faylini to'liq yuklab olish (faqat Super Admin)
pub async fn download_log(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    query: web::Query<DownloadLogQuery>,
) -> HttpResponse {
    let claims = match req.extensions().get::<Claims>().cloned() {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(serde_json::json!({
            "error": true,
            "message": "Avtorizatsiya talab qilinadi"
        })),
    };

    if let Err(resp) = require_super_admin(&claims, pool.get_ref(), config.get_ref()).await {
        return resp;
    }

    match AdminLogService::get_log_file_path(&query.file) {
        Ok(path) => match NamedFile::open(path) {
            Ok(named_file) => named_file.into_response(&req),
            Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                "error": true,
                "message": format!("Faylni yuklab bo'lmadi: {}", e)
            })),
        },
        Err(e) => HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": e.to_string()
        })),
    }
}

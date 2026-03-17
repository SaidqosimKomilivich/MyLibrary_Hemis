use actix_multipart::Multipart;
use actix_web::{web, HttpResponse};
use futures_util::TryStreamExt;
use std::io::Write;
use std::path::Path;
use uuid::Uuid;

use crate::config::Config;
use crate::errors::AppError;
use crate::middleware::auth_middleware::{require_role, Claims};

/// Kengaytmaga qarab subdirectory rasmmi yoki yo'qligini tekshiradi
fn is_image_subdir(subdir: &str) -> bool {
    subdir == "images"
}

/// Ruxsat berilgan fayl turlari
const ALLOWED_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "webp", "pdf", "svg", "mp3", "ogg", "wav", "m4a",
];

/// Rasm kengaytmalari
const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "svg"];

/// Audio kengaytmalari
const AUDIO_EXTENSIONS: &[&str] = &["mp3", "ogg", "wav", "m4a"];

/// Rasmlar uchun maksimal fayl hajmi (5 MB)
const MAX_IMAGE_SIZE: usize = 5 * 1024 * 1024;

/// PDF va Audio uchun maksimal fayl hajmi (100 MB)
const MAX_DOC_AUDIO_SIZE: usize = 100 * 1024 * 1024;

/// Fayl kengaytmasini olish
fn get_extension(filename: &str) -> Option<String> {
    Path::new(filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
}

/// Kengaytmaga qarab subdirectory aniqlash
fn get_subdir(extension: &str) -> &'static str {
    if IMAGE_EXTENSIONS.contains(&extension) {
        "images"
    } else if AUDIO_EXTENSIONS.contains(&extension) {
        "audio"
    } else {
        "pdf"
    }
}

/// POST /api/upload — Fayl yuklash (faqat autentifikatsiya qilingan foydalanuvchilar)
pub async fn upload_file(
    config: web::Data<Config>,
    claims: Claims,
    mut payload: Multipart,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin", "staff", "teacher"]) {
        return Ok(resp);
    }

    let upload_dir = &config.upload_dir;

    // Subdirectorylarni yaratish
    for subdir in &["images", "audio", "pdf"] {
        let dir_path = format!("{}/{}", upload_dir, subdir);
        std::fs::create_dir_all(&dir_path).map_err(|e| {
            tracing::error!("Papkani yaratib bo'lmadi: {} — {}", dir_path, e);
            actix_web::error::ErrorInternalServerError("Fayl tizimi xatosi")
        })?;
    }

    let mut uploaded_files: Vec<serde_json::Value> = Vec::new();

    while let Ok(Some(mut field)) = payload.try_next().await {
        let original_filename = field
            .content_disposition()
            .and_then(|cd| cd.get_filename().map(|s| s.to_string()))
            .ok_or_else(|| actix_web::error::ErrorBadRequest("Fayl nomi topilmadi"))?;

        let extension = get_extension(&original_filename)
            .ok_or_else(|| actix_web::error::ErrorBadRequest("Fayl kengaytmasi aniqlanmadi"))?;

        if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
            return Err(actix_web::error::ErrorBadRequest(format!(
                "Ruxsat berilmagan fayl turi: .{}. Ruxsat berilgan: {}",
                extension,
                ALLOWED_EXTENSIONS.join(", ")
            )));
        }

        let subdir = get_subdir(&extension);
        let unique_filename = format!("{}.{}", Uuid::new_v4(), extension);
        let filepath = format!("{}/{}/{}", upload_dir, subdir, unique_filename);

        let mut file = std::fs::File::create(&filepath).map_err(|e| {
            tracing::error!("Fayl yaratib bo'lmadi: {}", e);
            actix_web::error::ErrorInternalServerError("Fayl saqlashda xatolik")
        })?;

        let max_file_size = if subdir == "images" {
            MAX_IMAGE_SIZE
        } else {
            MAX_DOC_AUDIO_SIZE
        };

        let mut total_size: usize = 0;

        while let Ok(Some(chunk)) = field.try_next().await {
            total_size += chunk.len();

            if total_size > max_file_size {
                let _ = std::fs::remove_file(&filepath);
                return Err(actix_web::error::ErrorBadRequest(format!(
                    "Fayl hajmi {} MB dan oshmasligi kerak",
                    max_file_size / (1024 * 1024)
                )));
            }

            file.write_all(&chunk).map_err(|e| {
                tracing::error!("Faylga yozishda xatolik: {}", e);
                actix_web::error::ErrorInternalServerError("Fayl saqlashda xatolik")
            })?;
        }

        let file_url = format!("/uploads/{}/{}", subdir, unique_filename);

        tracing::info!(
            original_name = %original_filename,
            saved_as = %unique_filename,
            subdir = %subdir,
            size_bytes = total_size,
            "Fayl muvaffaqiyatli yuklandi"
        );

        uploaded_files.push(serde_json::json!({
            "original_name": original_filename,
            "filename": unique_filename,
            "url": file_url,
            "size": total_size,
            "extension": extension,
        }));
    }

    if uploaded_files.is_empty() {
        return Err(actix_web::error::ErrorBadRequest(
            "Hech qanday fayl yuklanmadi",
        ));
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": format!("{} ta fayl muvaffaqiyatli yuklandi", uploaded_files.len()),
        "files": uploaded_files
    })))
}

/// DELETE /api/upload — Faylni diskdan o'chirish
/// Body: { "url": "/uploads/images/uuid.jpg" }
pub async fn delete_file(
    config: web::Data<Config>,
    claims: Claims,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin", "staff", "teacher"]) {
        return Ok(resp);
    }

    let url = body["url"]
        .as_str()
        .ok_or_else(|| actix_web::error::ErrorBadRequest("'url' maydoni talab qilinadi"))?;

    // URL dan fayl yo'lini olish: /uploads/images/uuid.jpg -> ./uploads/images/uuid.jpg
    let relative_path = url
        .strip_prefix("/uploads/")
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Noto'g'ri fayl URL"))?;

    // Path traversal xavfsizlik tekshiruvi
    if relative_path.contains("..") {
        return Err(actix_web::error::ErrorBadRequest("Noto'g'ri fayl yo'li").into());
    }

    let filepath = format!("{}/{}", config.upload_dir, relative_path);

    if Path::new(&filepath).exists() {
        std::fs::remove_file(&filepath).map_err(|e| {
            tracing::error!("Faylni o'chirib bo'lmadi: {} — {}", filepath, e);
            actix_web::error::ErrorInternalServerError("Faylni o'chirishda xatolik")
        })?;
        tracing::info!(file = %relative_path, "Fayl o'chirildi");
    } else {
        tracing::warn!(file = %relative_path, "Fayl topilmadi, lekin OK qaytariladi");
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Fayl o'chirildi"
    })))
}

/// GET /uploads/{subdir}/{filename} — Faylni o'qish
/// - Rasmlar (images): X-Accel-Redirect orqali Nginx tomonidan keshlangan holda tez qaytariladi
/// - PDF va Audio: faqat autentifikatsiya bo'lgan foydalanuvchilarga, to'g'ridan-to'g'ri stream qilinadi
pub async fn serve_file(
    claims: Option<Claims>,
    path: web::Path<(String, String)>,
    config: web::Data<Config>,
) -> Result<HttpResponse, AppError> {
    let (subdir, filename) = path.into_inner();

    // PDF va Audio uchun autentifikatsiya talab qilinadi
    if !is_image_subdir(&subdir) && claims.is_none() {
        return Err(AppError::Unauthorized(
            format!(
                "{} fayllarini o'qish uchun tizimga kirish talab qilinadi",
                if subdir == "pdf" { "PDF" } else { "Audio" }
            ),
        ));
    }

    // Path traversal xavfsizlik tekshiruvi
    if subdir.contains("..") || filename.contains("..") {
        return Err(AppError::BadRequest("Noto'g'ri fayl yo'li".to_string()));
    }

    let filepath = format!("{}/{}/{}", config.upload_dir, subdir, filename);
    let file_path = Path::new(&filepath);

    if !file_path.exists() {
        return Err(AppError::NotFound("Fayl topilmadi".to_string()));
    }

    // Content-Type aniqlash
    let ext = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let content_type = match ext.as_str() {
        "pdf"        => "application/pdf",
        "png"        => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp"       => "image/webp",
        "gif"        => "image/gif",
        "svg"        => "image/svg+xml",
        "mp3"        => "audio/mpeg",
        "ogg"        => "audio/ogg",
        "wav"        => "audio/wav",
        "m4a"        => "audio/mp4",
        _            => "application/octet-stream",
    };

    if is_image_subdir(&subdir) {
        // ── Rasmlar: Nginx X-Accel-Redirect orqali keshlangan holda qaytariladi ──
        use actix_web::http::header::HeaderValue;
        let internal_path = format!("/internal_uploads/{}/{}", subdir, filename);
        let accel_value = HeaderValue::from_str(&internal_path)
            .unwrap_or_else(|_| HeaderValue::from_static("/internal_uploads/unknown"));

        Ok(HttpResponse::Ok()
            .content_type(content_type)
            .insert_header(("X-Accel-Redirect", accel_value))
            .insert_header(("Content-Disposition", "inline"))
            .finish())
    } else {
        // ── PDF va Audio: To'g'ridan-to'g'ri backenddan stream qilinadi ──
        // Bu usul JS fetch().blob() to'g'ri ishlashini ta'minlaydi
        let file_bytes = std::fs::read(&filepath).map_err(|e| {
            tracing::error!("Fayl o'qishda xatolik: {} — {}", filepath, e);
            AppError::InternalError("Fayl o'qishda xatolik".to_string())
        })?;

        Ok(HttpResponse::Ok()
            .content_type(content_type)
            .insert_header(("Content-Disposition", "inline"))
            .insert_header(("Accept-Ranges", "bytes"))
            .body(file_bytes))
    }
}

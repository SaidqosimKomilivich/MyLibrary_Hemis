use actix_multipart::Multipart;
use actix_web::{web, HttpResponse};
use futures_util::TryStreamExt;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs::File as AsyncFile;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

use crate::config::Config;
use crate::errors::AppError;
use crate::middleware::auth_middleware::{require_role, Claims};

#[derive(Debug, Serialize, Deserialize)]
pub struct StreamTicketClaims {
    pub sub: String,
    pub path: String,
    pub exp: usize,
}

#[derive(Debug, Deserialize)]
pub struct StreamTicketRequest {
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct ServeFileQuery {
    pub ticket: Option<String>,
}

/// Kengaytmaga qarab subdirectory rasmmi yoki yo'qligini tekshiradi
fn is_image_subdir(subdir: &str) -> bool {
    subdir == "images"
}

/// Ruxsat berilgan fayl turlari
const ALLOWED_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "webp", "pdf", "svg", "mp3", "ogg", "wav", "m4a",
    "doc", "docx",
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

/// Faylning birinchi baytlarini (magic bytes) tekshirib, uning haqiqiy turini aniqlash
fn validate_magic_bytes(header: &[u8], extension: &str) -> bool {
    if header.is_empty() {
        return false;
    }

    match extension {
        "jpg" | "jpeg" => {
            header.len() >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF
        }
        "png" => {
            header.len() >= 4 && &header[0..4] == &[0x89, b'P', b'N', b'G']
        }
        "gif" => {
            header.len() >= 6 && (&header[0..6] == b"GIF87a" || &header[0..6] == b"GIF89a")
        }
        "webp" => {
            header.len() >= 12 && &header[0..4] == b"RIFF" && &header[8..12] == b"WEBP"
        }
        "svg" => {
            let sample_len = header.len().min(512);
            let s = String::from_utf8_lossy(&header[..sample_len]);
            let trimmed = s.trim_start_matches('\u{feff}').trim_start();
            trimmed.starts_with("<?xml") || trimmed.starts_with("<svg")
        }
        "pdf" => {
            header.len() >= 4 && &header[0..4] == b"%PDF"
        }
        "mp3" => {
            if header.len() >= 3 && &header[0..3] == b"ID3" {
                true
            } else if header.len() >= 2 && header[0] == 0xFF && (header[1] & 0xE0) == 0xE0 {
                true
            } else {
                false
            }
        }
        "ogg" => {
            header.len() >= 4 && &header[0..4] == b"OggS"
        }
        "wav" => {
            header.len() >= 12 && &header[0..4] == b"RIFF" && &header[8..12] == b"WAVE"
        }
        "m4a" => {
            header.len() >= 8 && &header[4..8] == b"ftyp"
        }
        "doc" | "docx" => {
            // DOCX = ZIP formatida (PK magic bytes)
            header.len() >= 4 && &header[0..4] == &[0x50, 0x4B, 0x03, 0x04]
        }
        _ => false,
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

    // Subdirectorylarni yaratish (asinxron)
    for subdir in &["images", "audio", "pdf"] {
        let dir_path = format!("{}/{}", upload_dir, subdir);
        tokio::fs::create_dir_all(&dir_path).await.map_err(|e| {
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

        let max_file_size = if subdir == "images" {
            MAX_IMAGE_SIZE
        } else {
            MAX_DOC_AUDIO_SIZE
        };

        let mut file_opt: Option<AsyncFile> = None;
        let mut total_size: usize = 0;
        let mut magic_checked = false;

        while let Ok(Some(chunk)) = field.try_next().await {
            total_size += chunk.len();

            if total_size > max_file_size {
                drop(file_opt);
                let _ = tokio::fs::remove_file(&filepath).await;
                return Err(actix_web::error::ErrorBadRequest(format!(
                    "Fayl hajmi {} MB dan oshmasligi kerak",
                    max_file_size / (1024 * 1024)
                )));
            }

            if !magic_checked {
                if !validate_magic_bytes(&chunk, &extension) {
                    return Err(actix_web::error::ErrorBadRequest(format!(
                        "Fayl mazmuni uning kengaytmasiga (.{}) mos kelmadi yoki xavfli format!",
                        extension
                    )));
                }
                magic_checked = true;

                let f = AsyncFile::create(&filepath).await.map_err(|e| {
                    tracing::error!("Fayl yaratib bo'lmadi: {}", e);
                    actix_web::error::ErrorInternalServerError("Fayl saqlashda xatolik")
                })?;
                file_opt = Some(f);
            }

            if let Some(ref mut file) = file_opt {
                file.write_all(&chunk).await.map_err(|e| {
                    tracing::error!("Faylga yozishda xatolik: {}", e);
                    actix_web::error::ErrorInternalServerError("Fayl saqlashda xatolik")
                })?;
            }
        }

        if let Some(ref mut file) = file_opt {
            let _ = file.flush().await;
        }

        if file_opt.is_none() {
            return Err(actix_web::error::ErrorBadRequest("Fayl bo'sh bo'lishi mumkin emas"));
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

/// POST /api/tinymce-upload (va /api/upload/tinymce)
/// TinyMCE uchun xotirani tejovchi (streaming), 10MB limitli va magic-bytes tekshiruvli rasm yuklash
/// - Xotira tejamkorligi: Multipart oqimi chunk-by-chunk yoziladi
/// - Maksimal hajm: 10 MB
/// - Magic bytes: `infer` orqali MIME type tekshiriladi (faqat jpeg, png, webp, gif)
/// - SVG qat'iy bloklanadi (XSS xavfini oldini olish uchun)
/// - Javob: {"location": "/uploads/images/<uuid>.<ext>"}
pub async fn upload_tinymce_image(
    config: web::Data<Config>,
    claims: Claims,
    mut payload: Multipart,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let upload_dir = &config.upload_dir;
    let images_dir = format!("{}/images", upload_dir);
    tokio::fs::create_dir_all(&images_dir).await.map_err(|e| {
        tracing::error!("Images papkasini yaratib bo'lmadi: {} — {}", images_dir, e);
        actix_web::error::ErrorInternalServerError("Fayl tizimi xatosi")
    })?;

    const MAX_TINYMCE_IMAGE_SIZE: usize = 10 * 1024 * 1024; // 10 MB

    while let Ok(Some(mut field)) = payload.try_next().await {
        let mut file_opt: Option<AsyncFile> = None;
        let mut total_size: usize = 0;
        let mut magic_checked = false;
        let mut saved_extension = String::new();
        let mut filepath = String::new();
        let mut unique_filename = String::new();

        while let Ok(Some(chunk)) = field.try_next().await {
            total_size += chunk.len();

            if total_size > MAX_TINYMCE_IMAGE_SIZE {
                drop(file_opt);
                if !filepath.is_empty() {
                    let _ = tokio::fs::remove_file(&filepath).await;
                }
                return Err(actix_web::error::ErrorBadRequest(
                    "Rasm hajmi 10 MB dan oshmasligi kerak",
                ));
            }

            if !magic_checked {
                // Determine mime type from magic bytes using `infer`
                let kind = infer::get(&chunk);
                let mime = kind.map(|k| k.mime_type()).unwrap_or("");
                let ext = kind.map(|k| k.extension()).unwrap_or("");

                // Safe image formats whitelist
                let is_safe = matches!(mime, "image/jpeg" | "image/png" | "image/webp" | "image/gif");

                // Explicitly check for SVG or any non-whitelisted type
                if !is_safe || mime == "image/svg+xml" || ext == "svg" {
                    return Err(actix_web::error::ErrorBadRequest(
                        "Faqat xavfsiz rasm formatlariga (JPEG, PNG, WebP, GIF) ruxsat beriladi. SVG taqiqlangan!",
                    ));
                }

                saved_extension = ext.to_string();
                unique_filename = format!("{}.{}", Uuid::new_v4(), saved_extension);
                filepath = format!("{}/{}", images_dir, unique_filename);

                let f = AsyncFile::create(&filepath).await.map_err(|e| {
                    tracing::error!("TinyMCE rasm fayli yaratib bo'lmadi: {}", e);
                    actix_web::error::ErrorInternalServerError("Fayl saqlashda xatolik")
                })?;
                file_opt = Some(f);
                magic_checked = true;
            }

            if let Some(ref mut file) = file_opt {
                file.write_all(&chunk).await.map_err(|e| {
                    tracing::error!("Faylga yozishda xatolik: {}", e);
                    actix_web::error::ErrorInternalServerError("Fayl saqlashda xatolik")
                })?;
            }
        }

        if let Some(ref mut file) = file_opt {
            let _ = file.flush().await;
        }

        if file_opt.is_none() {
            return Err(actix_web::error::ErrorBadRequest("Fayl bo'sh bo'lishi mumkin emas"));
        }

        let location = format!("/uploads/images/{}", unique_filename);

        tracing::info!(
            filename = %unique_filename,
            size_bytes = total_size,
            ext = %saved_extension,
            "TinyMCE rasmi muvaffaqiyatli yuklandi"
        );

        // TinyMCE expects: { "location": "url" }
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "location": location
        })));
    }

    Err(actix_web::error::ErrorBadRequest("Yuklash uchun fayl topilmadi"))
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

/// GET /api/uploads/stream-ticket?path=pdf/...
/// Autentifikatsiya qilingan foydalanuvchiga PDF yoki Audio faylni xavfsiz o'qish uchun
/// 2 soat amal qiluvchi vaqtinchalik imzolangan chipta (ticket) berish
pub async fn get_stream_ticket(
    claims: Claims,
    query: web::Query<StreamTicketRequest>,
    config: web::Data<Config>,
) -> Result<HttpResponse, AppError> {
    let raw_path = query.path.trim();

    // Yo'ldan boshidagi "/uploads/" yoki "/" ni tozalaymiz
    let clean_path = raw_path
        .trim_start_matches('/')
        .trim_start_matches("uploads/")
        .to_string();

    if clean_path.contains("..") {
        return Err(AppError::BadRequest("Noto'g'ri fayl yo'li".into()));
    }

    // Faqat pdf yoki audio papkalariga ticket beriladi
    if !clean_path.starts_with("pdf/") && !clean_path.starts_with("audio/") {
        return Err(AppError::BadRequest("Faqat PDF va Audio fayllar uchun chipta beriladi".into()));
    }

    let exp = (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp() as usize;
    let ticket_claims = StreamTicketClaims {
        sub: claims.sub.clone(),
        path: clean_path.clone(),
        exp,
    };

    let token = encode(
        &Header::default(),
        &ticket_claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    ).map_err(|e| {
        tracing::error!("Stream chiptasini yaratishda xatolik: {}", e);
        AppError::InternalError("Xavfsiz chipta yaratib bo'lmadi".into())
    })?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "ticket": token,
        "expires_at": exp,
        "stream_url": format!("/uploads/{}?ticket={}", clean_path, token)
    })))
}

/// GET /uploads/{subdir}/{filename} — Faylni o'qish
/// - Rasmlar (images): X-Accel-Redirect orqali Nginx tomonidan keshlangan holda tez qaytariladi
/// - PDF va Audio: faqat autentifikatsiya bo'lgan va xavfsiz chiptaga (stream ticket) ega foydalanuvchilarga stream qilinadi
pub async fn serve_file(
    req: actix_web::HttpRequest,
    claims: Option<Claims>,
    path: web::Path<(String, String)>,
    query: web::Query<ServeFileQuery>,
    config: web::Data<Config>,
) -> Result<HttpResponse, AppError> {
    let (subdir, filename) = path.into_inner();

    // Path traversal xavfsizlik tekshiruvi
    if subdir.contains("..") || filename.contains("..") {
        return Err(AppError::BadRequest("Noto'g'ri fayl yo'li".to_string()));
    }

    // PDF va Audio uchun xavfsizlik va vaqtinchalik chipta (Signed Ticket) tekshiruvi
    if !is_image_subdir(&subdir) {
        let current_path = format!("{}/{}", subdir, filename);
        let mut access_granted = false;

        // 1. Agar ticket yuborilgan bo'lsa, uni tekshiramiz
        if let Some(ticket_str) = &query.ticket {
            let mut validation = Validation::default();
            validation.validate_exp = true;
            if let Ok(token_data) = decode::<StreamTicketClaims>(
                ticket_str,
                &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
                &validation,
            ) {
                if token_data.claims.path == current_path {
                    access_granted = true;
                }
            }
        }

        // 2. Agar ticket bo'lmasa, lekin tizim administratori bo'lsa ruxsat beriladi
        if !access_granted {
            if let Some(user_claims) = &claims {
                if user_claims.role == "admin" {
                    access_granted = true;
                }
            }
        }

        // 3. Agar ruxsat tasdiqlanmasa — 403 Forbidden
        if !access_granted {
            return Err(AppError::Forbidden(
                "Faylga to'g'ridan-to'g'ri kirish taqiqlangan. Xavfsiz stream chiptasi talab qilinadi yoki muddati o'tgan".to_string(),
            ));
        }
    }

    let filepath = format!("{}/{}/{}", config.upload_dir, subdir, filename);
    let file_path = Path::new(&filepath);

    if !file_path.exists() {
        return Err(AppError::NotFound("Fayl topilmadi".to_string()));
    }

    if is_image_subdir(&subdir) {
        // Content-Type aniqlash (rasmlar uchun)
        let ext = file_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        let content_type = match ext.as_str() {
            "png"        => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "webp"       => "image/webp",
            "gif"        => "image/gif",
            "svg"        => "image/svg+xml",
            _            => "image/jpeg",
        };

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
        // ── PDF va Audio: True streaming with Range Request support ──
        let named_file = actix_files::NamedFile::open(&filepath).map_err(|e| {
            tracing::error!("Fayl ochishda xatolik: {} — {}", filepath, e);
            AppError::InternalError("Fayl ochishda xatolik".to_string())
        })?;

        Ok(named_file
            .set_content_disposition(actix_web::http::header::ContentDisposition {
                disposition: actix_web::http::header::DispositionType::Inline,
                parameters: vec![],
            })
            .into_response(&req))
    }
}

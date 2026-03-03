use actix_web::{web, HttpResponse};
use sqlx::PgPool;

use crate::config::Config;
use crate::dto::user::{PaginatedUsersResponse, UserPaginationInfo, UserPaginationParams};
use crate::errors::AppError;
use crate::middleware::auth_middleware::{require_role, Claims};
use crate::repository::user_repository::UserRepository;
use crate::services::hemis_service::HemisService;

const DEFAULT_PER_PAGE: i64 = 20;

/// Super admin (tizim egasi) ekanligini tekshirish
async fn require_super_admin(
    claims: &Claims,
    pool: &PgPool,
    config: &Config,
) -> Result<(), HttpResponse> {
    let user_id =
        uuid::Uuid::parse_str(&claims.sub).map_err(|_| HttpResponse::Unauthorized().finish())?;

    let user = UserRepository::find_by_id(pool, user_id)
        .await
        .map_err(|_| HttpResponse::InternalServerError().finish())?
        .ok_or_else(|| HttpResponse::Unauthorized().finish())?;

    let is_super = user.user_id == config.admin_login
        || user.user_id == "admin"
        || user.user_id == "superadmin";

    if !is_super {
        return Err(HttpResponse::Forbidden().json(serde_json::json!({
            "error": true,
            "message": "Sizda ushbu amalni bajarish uchun ruxsat yo'q. Faqat Bosh sahifa administratori ko'ra oladi."
        })));
    }
    Ok(())
}

/// Umumiy paginatsiyali GET handler (students, teachers, employees, admins uchun)
async fn get_users_paginated(
    pool: &PgPool,
    roles: &[&str],
    params: UserPaginationParams,
) -> Result<HttpResponse, actix_web::Error> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(DEFAULT_PER_PAGE).max(1).min(100);
    let search = params.search.as_deref();
    let status = params.status.as_deref();

    let total_items = UserRepository::count_by_roles(pool, roles, search, status)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let total_pages = if total_items == 0 {
        1
    } else {
        (total_items as f64 / per_page as f64).ceil() as i64
    };

    let users =
        UserRepository::find_paginated_by_roles(pool, roles, page, per_page, search, status)
            .await
            .map_err(actix_web::error::ErrorInternalServerError)?;

    let user_responses: Vec<crate::dto::user::UserResponse> =
        users.into_iter().map(|u| u.into()).collect();

    Ok(HttpResponse::Ok().json(PaginatedUsersResponse {
        success: true,
        data: user_responses,
        pagination: UserPaginationInfo {
            current_page: page,
            per_page,
            total_items,
            total_pages,
        },
    }))
}

/// POST /api/sync/students
/// HEMIS API dan talabalarni sinxronlash (faqat admin uchun) — SSE Stream
pub async fn sync_students(
    claims: Claims,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    tracing::info!(
        user = %claims.sub,
        role = %claims.role,
        "HEMIS talabalar sinxronlashi boshlandi (SSE stream)"
    );

    let (tx, mut rx) =
        tokio::sync::mpsc::channel::<crate::services::hemis_service::SyncProgressEvent>(32);

    let pool_clone = pool.get_ref().clone();
    let config_clone = config.get_ref().clone();

    // Orqa fonda sinxronlashni boshlash
    tokio::spawn(async move {
        let result =
            HemisService::sync_students_stream(&pool_clone, &config_clone, tx.clone()).await;
        if let Err(e) = result {
            tracing::error!("HEMIS streaming sinxronlash xatosi: {}", e);
            let _ = tx
                .send(crate::services::hemis_service::SyncProgressEvent {
                    stage: "error".into(),
                    message: format!("Sinxronlash xatosi: {}", e),
                    processed: 0,
                    total: 0,
                    created: 0,
                    updated: 0,
                    current_page: 0,
                    total_pages: 0,
                })
                .await;
        }
        // tx drop bo'lganda rx stream tugaydi
    });

    // SSE oqimini yaratish
    let stream = async_stream::stream! {
        while let Some(event) = rx.recv().await {
            let json = serde_json::to_string(&event).unwrap_or_default();
            let sse_data = format!("event: {}\ndata: {}\n\n", event.stage, json);
            yield Ok::<_, actix_web::Error>(actix_web::web::Bytes::from(sse_data));
        }
    };

    Ok(HttpResponse::Ok()
        .content_type("text/event-stream")
        .insert_header(("Cache-Control", "no-cache"))
        .insert_header(("Connection", "keep-alive"))
        .insert_header(("X-Accel-Buffering", "no"))
        .streaming(stream))
}

/// GET /api/sync/students
/// Bazadagi talabalarni paginatsiya bilan olish
pub async fn get_students(
    claims: Claims,
    pool: web::Data<PgPool>,
    query: web::Query<UserPaginationParams>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    get_users_paginated(pool.get_ref(), &["student"], query.into_inner()).await
}

/// POST /api/sync/teachers
/// HEMIS API dan o'qituvchilarni sinxronlash (faqat admin uchun) — SSE Stream
pub async fn sync_teachers(
    claims: Claims,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    tracing::info!(
        user = %claims.sub,
        "HEMIS o'qituvchilar sinxronlashi boshlandi (SSE stream)"
    );

    let (tx, mut rx) =
        tokio::sync::mpsc::channel::<crate::services::hemis_service::SyncProgressEvent>(32);

    let pool_clone = pool.get_ref().clone();
    let config_clone = config.get_ref().clone();

    tokio::spawn(async move {
        let result = HemisService::sync_employees_stream(
            &pool_clone,
            &config_clone,
            "teacher",
            "teacher",
            tx.clone(),
        )
        .await;
        if let Err(e) = result {
            tracing::error!("HEMIS o'qituvchilar streaming sinxronlash xatosi: {}", e);
            let _ = tx
                .send(crate::services::hemis_service::SyncProgressEvent {
                    stage: "error".into(),
                    message: format!("Sinxronlash xatosi: {}", e),
                    processed: 0,
                    total: 0,
                    created: 0,
                    updated: 0,
                    current_page: 0,
                    total_pages: 0,
                })
                .await;
        }
    });

    let stream = async_stream::stream! {
        while let Some(event) = rx.recv().await {
            let json = serde_json::to_string(&event).unwrap_or_default();
            let sse_data = format!("event: {}\ndata: {}\n\n", event.stage, json);
            yield Ok::<_, actix_web::Error>(actix_web::web::Bytes::from(sse_data));
        }
    };

    Ok(HttpResponse::Ok()
        .content_type("text/event-stream")
        .insert_header(("Cache-Control", "no-cache"))
        .insert_header(("Connection", "keep-alive"))
        .insert_header(("X-Accel-Buffering", "no"))
        .streaming(stream))
}

/// GET /api/sync/teachers
/// Bazadagi o'qituvchilarni paginatsiya bilan olish
pub async fn get_teachers(
    claims: Claims,
    pool: web::Data<PgPool>,
    query: web::Query<UserPaginationParams>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    get_users_paginated(pool.get_ref(), &["teacher"], query.into_inner()).await
}

/// GET /api/sync/staff
/// Bazadagi kutubxonachilarni paginatsiya bilan olish
pub async fn get_staff(
    claims: Claims,
    pool: web::Data<PgPool>,
    query: web::Query<UserPaginationParams>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    get_users_paginated(pool.get_ref(), &["staff"], query.into_inner()).await
}

/// POST /api/sync/employees
/// HEMIS API dan xodimlarni sinxronlash (faqat admin uchun) — SSE Stream
pub async fn sync_employees(
    claims: Claims,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    tracing::info!(
        user = %claims.sub,
        "HEMIS xodimlar sinxronlashi boshlandi (SSE stream)"
    );

    let (tx, mut rx) =
        tokio::sync::mpsc::channel::<crate::services::hemis_service::SyncProgressEvent>(32);

    let pool_clone = pool.get_ref().clone();
    let config_clone = config.get_ref().clone();

    tokio::spawn(async move {
        let result = HemisService::sync_employees_stream(
            &pool_clone,
            &config_clone,
            "employee",
            "employee", // actual_role sync_employees_stream ichida department ga qarab aniqlanadi
            tx.clone(),
        )
        .await;
        if let Err(e) = result {
            tracing::error!("HEMIS xodimlar streaming sinxronlash xatosi: {}", e);
            let _ = tx
                .send(crate::services::hemis_service::SyncProgressEvent {
                    stage: "error".into(),
                    message: format!("Sinxronlash xatosi: {}", e),
                    processed: 0,
                    total: 0,
                    created: 0,
                    updated: 0,
                    current_page: 0,
                    total_pages: 0,
                })
                .await;
        }
    });

    let stream = async_stream::stream! {
        while let Some(event) = rx.recv().await {
            let json = serde_json::to_string(&event).unwrap_or_default();
            let sse_data = format!("event: {}\ndata: {}\n\n", event.stage, json);
            yield Ok::<_, actix_web::Error>(actix_web::web::Bytes::from(sse_data));
        }
    };

    Ok(HttpResponse::Ok()
        .content_type("text/event-stream")
        .insert_header(("Cache-Control", "no-cache"))
        .insert_header(("Connection", "keep-alive"))
        .insert_header(("X-Accel-Buffering", "no"))
        .streaming(stream))
}

/// GET /api/sync/employees
/// Bazadagi xodimlarni paginatsiya bilan olish
pub async fn get_employees(
    claims: Claims,
    pool: web::Data<PgPool>,
    query: web::Query<UserPaginationParams>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    get_users_paginated(pool.get_ref(), &["staff", "employee"], query.into_inner()).await
}

/// GET /api/sync/admins
/// Bazadagi adminlarni paginatsiya bilan olish (faqat super admin uchun)
pub async fn get_admins(
    claims: Claims,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    query: web::Query<UserPaginationParams>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }
    if let Err(resp) = require_super_admin(&claims, pool.get_ref(), config.get_ref()).await {
        return Ok(resp);
    }

    get_users_paginated(pool.get_ref(), &["admin"], query.into_inner()).await
}

/// GET /api/users/{id} - ID orqali foydalanuvchini olish (Kamera skaneri uchun)
pub async fn get_user_by_id(
    // require_role ishlatish ixtiyoriy, agar auth middleware bo'lsa
    pool: web::Data<PgPool>,
    path: web::Path<uuid::Uuid>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    let user = UserRepository::find_by_id_any(pool.get_ref(), user_id).await?;

    if let Some(u) = user {
        let response: crate::dto::user::UserResponse = u.into();
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": response
        })))
    } else {
        Err(AppError::NotFound("Foydalanuvchi topilmadi".to_string()))
    }
}

/// PUT /api/users/{id}/role
/// Faqat admin: foydalanuvchi rolini o'zgartirish
pub async fn update_user_role(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<uuid::Uuid>,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    let target_id = path.into_inner();
    let new_role = body
        .get("role")
        .and_then(|v| v.as_str())
        .ok_or_else(|| actix_web::error::ErrorBadRequest("'role' maydoni talab qilinadi"))?;

    // Ruxsat etilgan rollar
    let allowed_roles = ["admin", "staff", "teacher", "student", "employee"];
    if !allowed_roles.contains(&new_role) {
        return Err(actix_web::error::ErrorBadRequest(format!(
            "Noto'g'ri rol: '{}'. Ruxsat etilgan rollar: {:?}",
            new_role, allowed_roles
        )));
    }

    // Foydalanuvchini tekshirish
    UserRepository::find_by_id_any(pool.get_ref(), target_id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound("Foydalanuvchi topilmadi"))?;

    UserRepository::update_role(pool.get_ref(), target_id, new_role)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    tracing::info!(target_user = %target_id, admin = %claims.sub, new_role = %new_role, "Rol o'zgartirildi");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": format!("Rol '{}' ga o'zgartirildi", new_role)
    })))
}

/// PUT /api/users/{id}/status
/// Faqat admin: foydalanuvchi faol/nofaol holatini o'zgartirish
pub async fn update_user_status(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<uuid::Uuid>,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, actix_web::Error> {
    if let Err(resp) = require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    let target_id = path.into_inner();
    let active = body
        .get("active")
        .and_then(|v| v.as_bool())
        .ok_or_else(|| {
            actix_web::error::ErrorBadRequest("'active' maydoni talab qilinadi (true/false)")
        })?;

    // Foydalanuvchini tekshirish
    let user = UserRepository::find_by_id_any(pool.get_ref(), target_id)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorNotFound("Foydalanuvchi topilmadi"))?;

    UserRepository::update_active(pool.get_ref(), target_id, active)
        .await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let status_label = if active { "Faol" } else { "Nofaol" };
    tracing::info!(target_user = %user.user_id, admin = %claims.sub, active = %active, "Holat o'zgartirildi");

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": format!("Foydalanuvchi holati '{}' ga o'zgartirildi", status_label)
    })))
}

/// GET /api/proxy/image?url=...
/// Tashqi (HEMIS) rasmlarni proxy orqali yuklash — CORS muammosini hal qiladi
pub async fn proxy_image(
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let url = match query.get("url") {
        Some(u) if !u.is_empty() => u.clone(),
        _ => {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "url parametri kerak"
            })));
        }
    };

    // Faqat ruxsat etilgan domenlardan rasm olish (xavfsizlik)
    if !url.contains("hemis.") && !url.contains("jbnuu.uz") {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Faqat HEMIS serveridan rasm olish mumkin"
        })));
    }

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| {
            actix_web::error::ErrorInternalServerError(format!("HTTP client xatosi: {}", e))
        })?;

    let response =
        client.get(&url).send().await.map_err(|e| {
            actix_web::error::ErrorBadGateway(format!("Rasmni olishda xatolik: {}", e))
        })?;

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = response.bytes().await.map_err(|e| {
        actix_web::error::ErrorBadGateway(format!("Rasmni o'qishda xatolik: {}", e))
    })?;

    Ok(HttpResponse::Ok()
        .content_type(content_type)
        .insert_header(("Cache-Control", "public, max-age=86400"))
        .insert_header(("Access-Control-Allow-Origin", "*"))
        .body(bytes))
}

use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::mpsc;

use crate::config::Config;
use crate::dto::hemis::{
    HemisApiResponse, HemisEmployeeApiResponse, SyncResponse, HemisStudentAuthResponse,
    UserDebtSummary, WeeklySyncReportResponse,
};
use crate::dto::message::SendMessageDto;
use crate::errors::AppError;
use crate::repository::message_repository::MessageRepository;
use crate::repository::rental_repository::RentalRepository;
use crate::repository::user_repository::UserRepository;
use crate::services::auth_service::AuthService;
use crate::services::message_service::MessageService;

/// SSE orqali frontendga yuboriladigan progress xabari
#[derive(serde::Serialize, Clone, Debug)]
pub struct SyncProgressEvent {
    /// Hozirgi bosqich: "fetching", "processing", "complete", "error"
    pub stage: String,
    /// Inson uchun tushunarli xabar
    pub message: String,
    /// Qayta ishlangan foydalanuvchilar soni (jami)
    pub processed: i64,
    /// Umumiy kutilayotgan foydalanuvchilar soni (HEMIS dan olingan)
    pub total: i64,
    /// Yaratilgan yangi foydalanuvchilar
    pub created: i64,
    /// Yangilangan foydalanuvchilar
    pub updated: i64,
    /// Hozirgi sahifa raqami
    pub current_page: i64,
    /// Jami sahifalar soni
    pub total_pages: i64,
}

pub struct HemisService;

impl HemisService {
    /// ═══════════════════════════════════════════════════════════════
    /// YANGI: Oqimli (Streaming Pipeline) talabalar sinxronlashi
    /// Har bir HEMIS sahifasi yuklanishi bilan darhol qayta ishlanadi,
    /// bazaga yoziladi va xotiradan tozalanadi.
    /// Progress xabarlari `tx` kanali orqali SSE ga uzatiladi.
    /// ═══════════════════════════════════════════════════════════════
    
    pub async fn auth_student(config: &Config, login: &str, password: &str) -> Result<String, AppError> {
        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(config.hemis_skip_ssl)
            .user_agent("MyLibrary-Backend/1.0")
            .timeout(std::time::Duration::from_secs(15))
            .connect_timeout(std::time::Duration::from_secs(5))
            .build()
            .map_err(|e| {
                AppError::InternalError(format!("HTTP client yaratishda xatolik: {}", e))
            })?;

        let url = format!("{}/rest/v1/auth/login", config.hemis_base_url);
        
        let payload = serde_json::json!({
            "login": login,
            "password": password
        });

        let response = client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| {
                AppError::InternalError(format!("HEMIS API ga so'rov yuborishda xatolik: {}", e))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_else(|_| "Noma'lum xato".to_string());
            tracing::warn!("HEMIS auth xatosi: {} - {}", status, body);
            
            match status.as_u16() {
                401 => {
                    return Err(AppError::Unauthorized("Login yoki parol noto'g'ri (HEMIS)".to_string()));
                }
                403 => {
                    return Err(AppError::Forbidden(
                        "HEMIS tizimi so'rovni rad etdi (403 Forbidden). Server IP manzili cheklangan bo'lishi mumkin. Iltimos ma'muriyatga murojaat qiling.".to_string()
                    ));
                }
                429 => {
                    return Err(AppError::Forbidden(
                        "HEMIS tizimida so'rovlar chegarasi oshdi (429 Too Many Requests). Iltimos, bir necha daqiqadan so'ng qayta urinib ko'ring.".to_string()
                    ));
                }
                400 => {
                    return Err(AppError::BadRequest(
                        "HEMIS so'rov xatosi (400 Bad Request). Login yoki parol formati mos kelmadi.".to_string()
                    ));
                }
                _ => {
                    return Err(AppError::InternalError("HEMIS serveri bilan ulanishda xatolik yuz berdi".to_string()));
                }
            }
        }

        let hemis_response: HemisStudentAuthResponse = response.json().await.map_err(|e| {
            AppError::InternalError(format!("HEMIS javobini parse qilishda xatolik: {}", e))
        })?;

        if !hemis_response.success {
            let err_msg = hemis_response.error.unwrap_or_else(|| "HEMIS API rad etdi".to_string());
            tracing::warn!("HEMIS auth success: false. Xato: {}", err_msg);
            return Err(AppError::Unauthorized(format!("HEMIS xatosi: {}", err_msg)));
        }

        if let Some(data) = hemis_response.data {
             Ok(data.token)
        } else {
             Err(AppError::InternalError("HEMIS token topilmadi".to_string()))
        }
    }

    pub async fn sync_students_stream(
        pool: &PgPool,
        config: &Config,
        tx: mpsc::Sender<SyncProgressEvent>,
    ) -> Result<SyncResponse, AppError> {
        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(config.hemis_skip_ssl)
            .timeout(std::time::Duration::from_secs(30))
            .connect_timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| {
                AppError::InternalError(format!("HTTP client yaratishda xatolik: {}", e))
            })?;

        let page_size = 200;
        let mut page: i64 = 1;
        let mut total_pages: i64 = 1; // birinchi sahifadan aniqlanadi
        let mut total_items: i64 = 0;

        let mut global_created: i64 = 0;
        let mut global_updated: i64 = 0;
        let mut global_processed: i64 = 0;

        // ── 1-bosqich: Sahifama-sahifa yuklash va darhol qayta ishlash ──
        loop {
            let url = format!(
                "{}/rest/v1/data/student-list?page={}&limit={}",
                config.hemis_base_url, page, page_size
            );

            // Progress: yuklanmoqda
            let _ = tx
                .send(SyncProgressEvent {
                    stage: "fetching".into(),
                    message: format!("{}/{} sahifa yuklanmoqda...", page, total_pages),
                    processed: global_processed,
                    total: total_items,
                    created: global_created,
                    updated: global_updated,
                    current_page: page,
                    total_pages,
                })
                .await;

            tracing::info!(page = page, "HEMIS API dan talabalar olinmoqda (stream)...");

            let response = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", config.hemis_token))
                .send()
                .await
                .map_err(|e| {
                    AppError::InternalError(format!(
                        "HEMIS API ga so'rov yuborishda xatolik: {}",
                        e
                    ))
                })?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                let err_msg = format!("HEMIS API xatosi: {} - {}", status, body);
                let _ = tx
                    .send(SyncProgressEvent {
                        stage: "error".into(),
                        message: err_msg.clone(),
                        processed: global_processed,
                        total: total_items,
                        created: global_created,
                        updated: global_updated,
                        current_page: page,
                        total_pages,
                    })
                    .await;
                return Err(AppError::InternalError(err_msg));
            }

            let hemis_response: HemisApiResponse = response.json().await.map_err(|e| {
                AppError::InternalError(format!("HEMIS javobini parse qilishda xatolik: {}", e))
            })?;

            if !hemis_response.success {
                let err_msg = "HEMIS API success: false qaytardi".to_string();
                let _ = tx
                    .send(SyncProgressEvent {
                        stage: "error".into(),
                        message: err_msg.clone(),
                        processed: global_processed,
                        total: total_items,
                        created: global_created,
                        updated: global_updated,
                        current_page: page,
                        total_pages,
                    })
                    .await;
                return Err(AppError::InternalError(err_msg));
            }

            // Birinchi sahifadan total_pages va total_count aniqlaymiz
            total_pages = hemis_response.data.pagination.page_count;
            if page == 1 {
                // total_count ni total_pages * page_size orqali taxminlaymiz
                // yoki HEMIS javobidan to'g'ridan to'g'ri olish mumkin
                total_items = (total_pages as i64) * (page_size as i64);
            }

            let mut students = hemis_response.data.items;

            // ── Yaroqsiz yozuvlarni tozalash ──
            students.retain(|s| {
                if let Some(id) = &s.student_id_number {
                    !id.is_empty()
                } else {
                    false
                }
            });

            if students.is_empty() {
                // Bu sahifada hech narsa yo'q, keyingisiga o'tamiz
                if page >= total_pages {
                    break;
                }
                page += 1;
                continue;
            }

            // ── Bazadan mavjud ID larni tekshirish ──
            let page_user_ids: Vec<String> = students
                .iter()
                .map(|s| s.student_id_number.clone().unwrap())
                .collect();

            let existing_ids = UserRepository::find_existing_user_ids(pool, &page_user_ids).await?;

            let mut to_update = Vec::new();
            let mut to_create = Vec::new();

            for student in students {
                let uid = student.student_id_number.clone().unwrap();
                if existing_ids.contains(&uid) {
                    to_update.push(student);
                } else {
                    to_create.push(student);
                }
            }

            // ── Yangilash (bulk update) ──
            let updated_in_page = to_update.len() as i64;
            for chunk_slice in to_update.chunks(500) {
                let update_data = chunk_slice.iter().map(|s| {
                    let is_active = s.student_status
                        .as_ref()
                        .and_then(|st| st.code.as_deref())
                        .map(|code| code == "11")
                        .unwrap_or(true);
                    (
                        s.student_id_number.as_deref().unwrap(),
                        s.full_name.as_deref().unwrap_or("Noma'lum"),
                        s.short_name.as_deref(),
                        s.birth_date.and_then(|ts| {
                            chrono::DateTime::from_timestamp(ts, 0).map(|dt| dt.date_naive())
                        }),
                        None, // s.image.as_deref().filter(|st| !st.is_empty()),
                        s.email.as_deref().filter(|st| !st.is_empty()),
                        s.department.as_ref().and_then(|d| d.name.as_deref()),
                        s.specialty.as_ref().and_then(|sp| sp.name.as_deref()),
                        s.group.as_ref().and_then(|g| g.name.as_deref()),
                        s.education_form.as_ref().and_then(|e| e.name.as_deref()),
                        is_active,
                    )
                });
                UserRepository::bulk_update_students(pool, update_data).await?;
            }

            // ── Yaratish (hash + bulk insert) ──
            let created_in_page = to_create.len() as i64;
            let mut batch_to_insert = Vec::new();

            for student in to_create {
                let password_hash = "".to_string(); // Talabalar HEMIS paroli bilan kiradi, shuning uchun mahalliy parol kerak emas
                batch_to_insert.push((student, password_hash));
            }

            if !batch_to_insert.is_empty() {
                // Bulk insert
                let insert_data = batch_to_insert.iter().map(|(s, hash)| {
                    let is_active = s.student_status
                        .as_ref()
                        .and_then(|st| st.code.as_deref())
                        .map(|code| code == "11")
                        .unwrap_or(true);
                    (
                        s.student_id_number.as_deref().unwrap(),
                        hash.as_str(),
                        s.full_name.as_deref().unwrap_or("Noma'lum"),
                        s.short_name.as_deref(),
                        s.birth_date.and_then(|ts| {
                            chrono::DateTime::from_timestamp(ts, 0).map(|dt| dt.date_naive())
                        }),
                        None, // s.image.as_deref().filter(|st| !st.is_empty()),
                        s.email.as_deref().filter(|st| !st.is_empty()),
                        0i64, // id_card yangi yaratilganda 0 dan boshlanadi (yuklab olish soni)
                        s.department.as_ref().and_then(|d| d.name.as_deref()),
                        s.specialty.as_ref().and_then(|sp| sp.name.as_deref()),
                        s.group.as_ref().and_then(|g| g.name.as_deref()),
                        s.education_form.as_ref().and_then(|e| e.name.as_deref()),
                        is_active,
                    )
                });
                UserRepository::bulk_create_students(pool, insert_data).await?;
            }
            // batch_to_insert va to_create bu yerda drop bo'ladi — RAM tozalanadi

            // ── Hisoblagichlarni yangilash ──
            global_created += created_in_page;
            global_updated += updated_in_page;
            global_processed += created_in_page + updated_in_page;

            // Progress: sahifa qayta ishlandi
            let _ = tx
                .send(SyncProgressEvent {
                    stage: "processing".into(),
                    message: format!(
                        "{}/{} sahifa qayta ishlandi ({} yangi, {} yangilandi)",
                        page, total_pages, created_in_page, updated_in_page
                    ),
                    processed: global_processed,
                    total: total_items,
                    created: global_created,
                    updated: global_updated,
                    current_page: page,
                    total_pages,
                })
                .await;

            tracing::info!(
                page = page,
                total_pages = total_pages,
                created_in_page = created_in_page,
                updated_in_page = updated_in_page,
                global_processed = global_processed,
                "Sahifa qayta ishlandi (stream)"
            );

            if page >= total_pages {
                break;
            }
            page += 1;
        }

        // ── Yakuniy xabar ──
        let _ = tx
            .send(SyncProgressEvent {
                stage: "complete".into(),
                message: format!(
                    "Sinxronlash tugadi! {} ta yangi, {} ta yangilandi",
                    global_created, global_updated
                ),
                processed: global_processed,
                total: global_processed, // haqiqiy raqam
                created: global_created,
                updated: global_updated,
                current_page: total_pages,
                total_pages,
            })
            .await;

        tracing::info!(
            created = global_created,
            updated = global_updated,
            processed = global_processed,
            "Talabalar sinxronlash (streaming pipeline) tugadi"
        );

        Ok(SyncResponse {
            success: true,
            message: format!(
                "Talabalar sinxronlash muvaffaqiyatli! {} ta yangi, {} ta yangilandi",
                global_created, global_updated
            ),
            created: global_created,
            updated: global_updated,
            total: global_processed,
        })
    }

    /// ═══════════════════════════════════════════════════════════════
    /// YANGI: Oqimli (Streaming Pipeline) xodimlar sinxronlashi
    /// Har bir HEMIS sahifasi yuklanishi bilan darhol qayta ishlanadi,
    /// bazaga yoziladi va xotiradan tozalanadi.
    /// Progress xabarlari `tx` kanali orqali SSE ga uzatiladi.
    /// ═══════════════════════════════════════════════════════════════
    pub async fn sync_employees_stream(
        pool: &PgPool,
        config: &Config,
        type_filter: &str,
        role: &str,
        tx: mpsc::Sender<SyncProgressEvent>,
    ) -> Result<SyncResponse, AppError> {
        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(config.hemis_skip_ssl)
            .timeout(std::time::Duration::from_secs(30))
            .connect_timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| {
                AppError::InternalError(format!("HTTP client yaratishda xatolik: {}", e))
            })?;

        let label = if role == "teacher" {
            "O'qituvchilar"
        } else {
            "Xodimlar"
        };

        let page_size = 200;
        let mut page: i64 = 1;
        let mut total_pages: i64 = 1;
        let mut total_items: i64 = 0;

        let mut global_created: i64 = 0;
        let mut global_updated: i64 = 0;
        let mut global_processed: i64 = 0;

        loop {
            let url = format!(
                "{}/rest/v1/data/employee-list?type={}&page={}&limit={}",
                config.hemis_base_url, type_filter, page, page_size
            );

            // Progress: yuklanmoqda
            let _ = tx
                .send(SyncProgressEvent {
                    stage: "fetching".into(),
                    message: format!("{}: {}/{} sahifa yuklanmoqda...", label, page, total_pages),
                    processed: global_processed,
                    total: total_items,
                    created: global_created,
                    updated: global_updated,
                    current_page: page,
                    total_pages,
                })
                .await;

            tracing::info!(
                page = page,
                role = role,
                "HEMIS API dan xodimlar olinmoqda (stream)..."
            );

            let response = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", config.hemis_token))
                .send()
                .await
                .map_err(|e| {
                    AppError::InternalError(format!(
                        "HEMIS API ga so'rov yuborishda xatolik: {}",
                        e
                    ))
                })?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                let err_msg = format!("HEMIS Employee API xatosi: {} - {}", status, body);
                let _ = tx
                    .send(SyncProgressEvent {
                        stage: "error".into(),
                        message: err_msg.clone(),
                        processed: global_processed,
                        total: total_items,
                        created: global_created,
                        updated: global_updated,
                        current_page: page,
                        total_pages,
                    })
                    .await;
                return Err(AppError::InternalError(err_msg));
            }

            let hemis_response: HemisEmployeeApiResponse = response.json().await.map_err(|e| {
                AppError::InternalError(format!(
                    "HEMIS Employee javobini parse qilishda xatolik: {}",
                    e
                ))
            })?;

            if !hemis_response.success {
                let err_msg = "HEMIS Employee API success: false qaytardi".to_string();
                let _ = tx
                    .send(SyncProgressEvent {
                        stage: "error".into(),
                        message: err_msg.clone(),
                        processed: global_processed,
                        total: total_items,
                        created: global_created,
                        updated: global_updated,
                        current_page: page,
                        total_pages,
                    })
                    .await;
                return Err(AppError::InternalError(err_msg));
            }

            total_pages = hemis_response.data.pagination.page_count;
            if page == 1 {
                total_items = (total_pages as i64) * (page_size as i64);
            }

            let employees = hemis_response.data.items;

            let mut created_in_page: i64 = 0;
            let mut updated_in_page: i64 = 0;

            for employee in &employees {
                let is_active = employee
                    .employee_status
                    .as_ref()
                    .and_then(|s| s.code.as_deref())
                    .map(|code| code == "11")
                    .unwrap_or(false);

                let user_id = match &employee.employee_id_number {
                    Some(id) if !id.is_empty() && id != "0" => id.clone(),
                    _ => continue,
                };

                let full_name = employee
                    .full_name
                    .clone()
                    .unwrap_or_else(|| "Noma'lum".to_string());
                let short_name = employee.short_name.clone();

                let birth_date = employee.birth_date.and_then(|ts| {
                    chrono::DateTime::from_timestamp(ts, 0).map(|dt| dt.date_naive())
                });

                let department_name = employee.department.as_ref().and_then(|d| d.name.clone());
                let staff_position = employee
                    .staff_position
                    .as_ref()
                    .and_then(|s| s.name.clone());

                // Rolni department ga qarab aniqlash:
                // "AXBOROT RESURS MARKAZI" → "staff" (kutubxonachi), qolganlari → o'zining "role"i ("employee" yoki "teacher")
                let actual_role = if department_name
                    .as_deref()
                    .map(|d| d.to_uppercase().contains("AXBOROT RESURS MARKAZ"))
                    .unwrap_or(false)
                {
                    "staff"
                } else {
                    role
                };

                let existing = UserRepository::find_by_user_id_any(pool, &user_id).await?;
                // HEMIS rasmlarini olmaslik uchun None beramiz
                let image_url: Option<&str> = None;

                if existing.is_some() {
                    UserRepository::update_employee_info(
                        pool,
                        &user_id,
                        actual_role,
                        &full_name,
                        short_name.as_deref(),
                        birth_date,
                        image_url,
                        department_name.as_deref(),
                        staff_position.as_deref(),
                        is_active,
                    )
                    .await?;
                    updated_in_page += 1;
                } else {
                    let password_hash = AuthService::hash_password(&user_id)?;

                    UserRepository::create_employee(
                        pool,
                        &user_id,
                        &password_hash,
                        actual_role,
                        &full_name,
                        short_name.as_deref(),
                        birth_date,
                        image_url,
                        0i64, // id_card yangi yaratilganda 0 dan boshlanadi
                        department_name.as_deref(),
                        staff_position.as_deref(),
                        is_active,
                    )
                    .await?;
                    created_in_page += 1;
                }
            }
            // employees bu yerda drop bo'ladi — RAM tozalanadi

            global_created += created_in_page;
            global_updated += updated_in_page;
            global_processed += created_in_page + updated_in_page;

            // Progress: sahifa qayta ishlandi
            let _ = tx
                .send(SyncProgressEvent {
                    stage: "processing".into(),
                    message: format!(
                        "{}: {}/{} sahifa qayta ishlandi ({} yangi, {} yangilandi)",
                        label, page, total_pages, created_in_page, updated_in_page
                    ),
                    processed: global_processed,
                    total: total_items,
                    created: global_created,
                    updated: global_updated,
                    current_page: page,
                    total_pages,
                })
                .await;

            tracing::info!(
                page = page,
                total_pages = total_pages,
                created_in_page = created_in_page,
                updated_in_page = updated_in_page,
                role = role,
                "Xodimlar sahifasi qayta ishlandi (stream)"
            );

            if page >= total_pages {
                break;
            }
            page += 1;
        }

        // Yakuniy xabar
        let _ = tx
            .send(SyncProgressEvent {
                stage: "complete".into(),
                message: format!(
                    "{} sinxronlash tugadi! {} ta yangi, {} ta yangilandi",
                    label, global_created, global_updated
                ),
                processed: global_processed,
                total: global_processed,
                created: global_created,
                updated: global_updated,
                current_page: total_pages,
                total_pages,
            })
            .await;

        tracing::info!(
            created = global_created,
            updated = global_updated,
            processed = global_processed,
            role = role,
            "{} sinxronlash (streaming pipeline) tugadi",
            label
        );

        Ok(SyncResponse {
            success: true,
            message: format!(
                "{} sinxronlash muvaffaqiyatli! {} ta yangi, {} ta yangilandi",
                label, global_created, global_updated
            ),
            created: global_created,
            updated: global_updated,
            total: global_processed,
        })
    }

    /// ═══════════════════════════════════════════════════════════════
    /// HAFTALIK: Barcha talaba va xodimlar statusini tekshirish
    /// - Statusi o'zgargan (o'qishdan ketgan/bo'shagan) larni nofaol (active=false) qilish
    /// - Agar nomida qaytarilmagan kitob bo'lsa, barcha admin va kutubxonachilarga ogohlantirish yuborish
    /// ═══════════════════════════════════════════════════════════════
    pub async fn run_weekly_status_check(
        pool: &PgPool,
        config: &Config,
        message_service: Option<Arc<MessageService>>,
    ) -> Result<WeeklySyncReportResponse, AppError> {
        tracing::info!("🔍 Haftalik HEMIS status tekshiruvi boshlandi...");

        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(config.hemis_skip_ssl)
            .timeout(std::time::Duration::from_secs(30))
            .connect_timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| AppError::InternalError(format!("HTTP client yaratishda xatolik: {}", e)))?;

        let page_size = 200;
        let mut checked_students: i64 = 0;
        let mut checked_employees: i64 = 0;
        let mut deactivated_count: i64 = 0;
        let mut users_with_debt: Vec<UserDebtSummary> = Vec::new();

        // 1. TALABALAR STATUSINI TEKSHIRISH
        let mut page: i64 = 1;
        let mut total_pages: i64 = 1;

        loop {
            let url = format!(
                "{}/rest/v1/data/student-list?page={}&limit={}",
                config.hemis_base_url, page, page_size
            );

            let res = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", config.hemis_token))
                .send()
                .await;

            match res {
                Ok(response) if response.status().is_success() => {
                    if let Ok(api_res) = response.json::<HemisApiResponse>().await {
                        total_pages = api_res.data.pagination.page_count;
                        for student in api_res.data.items {
                            if let Some(uid) = student.student_id_number.as_deref().filter(|s| !s.is_empty()) {
                                checked_students += 1;
                                
                                // studentStatus tekshiruvi: "11" = Faol (o'qimoqda)
                                let is_active_in_hemis = student.student_status
                                    .as_ref()
                                    .and_then(|s| s.code.as_deref())
                                    .map(|code| code == "11")
                                    .unwrap_or(true);

                                if !is_active_in_hemis {
                                    if let Ok(was_changed) = UserRepository::set_user_active(pool, uid, false).await {
                                        if was_changed {
                                            deactivated_count += 1;
                                            tracing::warn!(student_id = %uid, "Talaba HEMIS da nofaol bo'lgani sababli nofaol qilindi");

                                            if let Ok(unreturned_books) = RentalRepository::get_unreturned_books_by_user_id(pool, uid).await {
                                                if !unreturned_books.is_empty() {
                                                    users_with_debt.push(UserDebtSummary {
                                                        user_id: uid.to_string(),
                                                        full_name: student.full_name.clone().unwrap_or_else(|| "Noma'lum".to_string()),
                                                        role: "student".to_string(),
                                                        department: student.department.as_ref().and_then(|d| d.name.clone()),
                                                        group_or_position: student.group.as_ref().and_then(|g| g.name.clone()),
                                                        phone: None,
                                                        books: unreturned_books,
                                                    });
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    // HEMIS da faol bo'lsa (masalan qayta tiklangan bo'lsa), faol holatga keltirish
                                    let _ = UserRepository::set_user_active(pool, uid, true).await;
                                }
                            }
                        }
                    }
                }
                _ => {
                    tracing::error!(page = page, "Talabalar sahifasini tekshirishda xatolik yuz berdi");
                    break;
                }
            }

            if page >= total_pages {
                break;
            }
            page += 1;
        }

        // 2. XODIMLAR VA O'QITUVCHILAR STATUSINI TEKSHIRISH
        let mut emp_page: i64 = 1;
        let mut emp_total_pages: i64 = 1;

        loop {
            let url = format!(
                "{}/rest/v1/data/employee-list?page={}&limit={}",
                config.hemis_base_url, emp_page, page_size
            );

            let res = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", config.hemis_token))
                .send()
                .await;

            match res {
                Ok(response) if response.status().is_success() => {
                    if let Ok(api_res) = response.json::<HemisEmployeeApiResponse>().await {
                        emp_total_pages = api_res.data.pagination.page_count;
                        for emp in api_res.data.items {
                            if let Some(uid) = emp.employee_id_number.as_deref().filter(|s| !s.is_empty()) {
                                checked_employees += 1;

                                // employeeStatus tekshiruvi: "11" = Ishlamoqda
                                let is_active_in_hemis = emp.employee_status
                                    .as_ref()
                                    .and_then(|s| s.code.as_deref())
                                    .map(|code| code == "11")
                                    .unwrap_or(true);

                                if !is_active_in_hemis {
                                    if let Ok(was_changed) = UserRepository::set_user_active(pool, uid, false).await {
                                        if was_changed {
                                            deactivated_count += 1;
                                            tracing::warn!(employee_id = %uid, "Xodim HEMIS da ishdan bo'shagani sababli nofaol qilindi");

                                            if let Ok(unreturned_books) = RentalRepository::get_unreturned_books_by_user_id(pool, uid).await {
                                                if !unreturned_books.is_empty() {
                                                    users_with_debt.push(UserDebtSummary {
                                                        user_id: uid.to_string(),
                                                        full_name: emp.full_name.clone().unwrap_or_else(|| "Noma'lum".to_string()),
                                                        role: "employee".to_string(),
                                                        department: emp.department.as_ref().and_then(|d| d.name.clone()),
                                                        group_or_position: emp.staff_position.as_ref().and_then(|s| s.name.clone()),
                                                        phone: None,
                                                        books: unreturned_books,
                                                    });
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    // HEMIS da faol bo'lsa (ishga qaytgan bo'lsa), faol holatga keltirish
                                    let _ = UserRepository::set_user_active(pool, uid, true).await;
                                }
                            }
                        }
                    }
                }
                _ => {
                    tracing::error!(page = emp_page, "Xodimlar sahifasini tekshirishda xatolik yuz berdi");
                    break;
                }
            }

            if emp_page >= emp_total_pages {
                break;
            }
            emp_page += 1;
        }

        // 3. ADMIN VA KUTUBXONA XODIMLARIGA OGOHLANTIRISH XABARI YUBORISH
        let mut alerts_sent: usize = 0;
        if !users_with_debt.is_empty() {
            if let Ok(staff_ids) = UserRepository::get_staff_and_admin_ids(pool).await {
                for user_debt in &users_with_debt {
                    let mut books_list = String::new();
                    for (idx, b) in user_debt.books.iter().enumerate() {
                        let inv_str = b.invoice_number.as_deref().unwrap_or("-");
                        books_list.push_str(&format!(
                            "\n{}. \"{}\" (Invoys: {}) — Topshirish muddati: {}",
                            idx + 1, b.title, inv_str, b.due_date
                        ));
                    }

                    let dept_info = user_debt.department.as_deref().unwrap_or("Mavjud emas");
                    let group_info = user_debt.group_or_position.as_deref().unwrap_or("-");

                    let msg_text = format!(
                        "⚠️ DIQQAT: Nofaol foydalanuvchida qaytarilmagan kitob(lar) mavjud!\n\n\
                        Foydalanuvchi: {} (ID: {}, Roli: {})\n\
                        Bo'lim/Fakultet: {}\n\
                        Guruh/Lavozim: {}\n\
                        Qaytarilmagan kitoblar soni: {} ta:{}\n\n\
                        Iltimos, ushbu shaxs bilan zudlik bilan bog'lanib, kitoblar kutubxonaga qaytarilishini ta'minlang!",
                        user_debt.full_name, user_debt.user_id, user_debt.role,
                        dept_info, group_info, user_debt.books.len(), books_list
                    );

                    for staff_id in &staff_ids {
                        let payload = SendMessageDto {
                            receiver_id: *staff_id,
                            title: format!("Qarzdorlik: {} (HEMIS nofaol)", user_debt.full_name),
                            message: msg_text.clone(),
                        };

                        if let Ok(saved_msg) = MessageRepository::create(pool, None, &payload).await {
                            if let Some(ref ms) = message_service {
                                ms.send_message(*staff_id, saved_msg);
                            }
                            alerts_sent += 1;
                        }
                    }
                }
            }
        }

        tracing::info!(
            checked_students,
            checked_employees,
            deactivated_count,
            debts = users_with_debt.len(),
            alerts_sent,
            "✅ Haftalik status tekshiruvi muvaffaqiyatli yakunlandi"
        );

        Ok(WeeklySyncReportResponse {
            success: true,
            message: format!(
                "Haftalik status tekshiruvi yakunlandi. Tekshirildi: {} talaba, {} xodim. Nofaol qilindi: {} kishi. Kitobi borlar: {} kishi.",
                checked_students, checked_employees, deactivated_count, users_with_debt.len()
            ),
            checked_students,
            checked_employees,
            deactivated_count,
            users_with_debt,
            alerts_sent_to_staff: alerts_sent,
        })
    }
}

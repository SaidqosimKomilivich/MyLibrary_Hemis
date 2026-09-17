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
    /// Nofaol qilingan foydalanuvchilar (bitirganlar/bo'shaganlar)
    pub deactivated: i64,
    /// Hozirgi sahifa raqami
    pub current_page: i64,
    /// Jami sahifalar soni
    pub total_pages: i64,
}

use std::sync::atomic::{AtomicBool, Ordering};

/// Sinxronlash jarayonlari bir vaqtda parallel ishlab ketishining oldini oluvchi qulf
#[derive(Clone, Default)]
pub struct SyncLock {
    is_running: Arc<AtomicBool>,
}

impl SyncLock {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Qulfni olishga urinish. Agar allaqachon boshqa sinxronlash ketayotgan bo'lsa `None` qaytaradi.
    /// Qaytgan `SyncGuard` obyekti drop bo'lganda (vazifa yakunlanganda yoki xato yuz berganda)
    /// qulf avtomatik bo'shatiladi (RAII pattern).
    pub fn try_lock(&self) -> Option<SyncGuard> {
        if self
            .is_running
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_ok()
        {
            Some(SyncGuard {
                is_running: self.is_running.clone(),
            })
        } else {
            None
        }
    }

    #[allow(dead_code)]
    pub fn is_syncing(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }
}

/// RAII qulf nazoratchisi
pub struct SyncGuard {
    is_running: Arc<AtomicBool>,
}

impl Drop for SyncGuard {
    fn drop(&mut self) {
        self.is_running.store(false, Ordering::SeqCst);
        tracing::info!("🔓 Sinxronlash qulfi bo'shatildi");
    }
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

        let page_size = 100;
        let mut page: i64 = 1;
        let mut total_pages: i64 = 1; // birinchi sahifadan aniqlanadi
        let mut total_items: i64 = 0;

        let mut global_created: i64 = 0;
        let mut global_updated: i64 = 0;
        let mut global_deactivated: i64 = 0;
        let mut global_processed: i64 = 0;
        let mut all_hemis_active_student_ids = std::collections::HashSet::new();

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
                    deactivated: global_deactivated,
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
                        deactivated: global_deactivated,
                        current_page: page,
                        total_pages,
                    })
                    .await;
                return Err(AppError::InternalError(err_msg));
            }

            let hemis_response: HemisApiResponse = match response.json::<HemisApiResponse>().await {
                Ok(data) => data,
                Err(e) => {
                    let err_msg = format!("HEMIS talabalar javobini o'qishda (JSON) xatolik: {}", e);
                    let _ = tx
                        .send(SyncProgressEvent {
                            stage: "error".into(),
                            message: err_msg.clone(),
                            processed: global_processed,
                            total: total_items,
                            created: global_created,
                            updated: global_updated,
                            deactivated: global_deactivated,
                            current_page: page,
                            total_pages,
                        })
                        .await;
                    return Err(AppError::InternalError(err_msg));
                }
            };

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
                        deactivated: global_deactivated,
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

            // ── Yaroqsiz va takroriy (dublikat) yozuvlarni tozalash ──
            let mut seen_page_ids = std::collections::HashSet::new();
            students.retain(|s| {
                if let Some(id) = &s.student_id_number {
                    if !id.is_empty() && seen_page_ids.insert(id.clone()) {
                        true
                    } else {
                        false
                    }
                } else {
                    false
                }
            });

            // Faol talabalar ID larini reconciliation (taqqoslash) uchun yig'ish
            for s in &students {
                if let Some(ref id) = s.student_id_number {
                    let is_active = s.student_status
                        .as_ref()
                        .and_then(|st| st.code.as_deref())
                        .map(|code| code != "14" && code != "15")
                        .unwrap_or(true);
                    if is_active {
                        all_hemis_active_student_ids.insert(id.clone());
                    }
                }
            }

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
                        .map(|code| code != "14" && code != "15")
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
                        .map(|code| code != "14" && code != "15")
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
                    deactivated: global_deactivated,
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

        // ── 2-bosqich: Solishtirish (Reconciliation) ──
        // HEMIS ro'yxatida bo'lmagan (o'qishni bitirgan, chetlashtirilgan) talabalarni nofaol qilish
        // XAVFSIZLIK (Circuit Breaker): Faqat HEMIS dan kamida 1 ta faol talaba olingandagina solishtirish o'tkaziladi
        if !all_hemis_active_student_ids.is_empty() && global_processed > 0 {
            let _ = tx
                .send(SyncProgressEvent {
                    stage: "processing".into(),
                    message: "Bitirgan va o'qishdan ketgan talabalar tekshirilmoqda...".into(),
                    processed: global_processed,
                    total: total_items,
                    created: global_created,
                    updated: global_updated,
                    deactivated: global_deactivated,
                    current_page: total_pages,
                    total_pages,
                })
                .await;

            let db_active_students = UserRepository::find_active_user_ids_by_role(pool, "student").await?;
            let missing_student_ids: Vec<String> = db_active_students
                .into_iter()
                .filter(|id| {
                    !all_hemis_active_student_ids.contains(id)
                        && id != &config.admin_login
                        && id != "admin"
                        && id != "superadmin"
                })
                .collect();

            if !missing_student_ids.is_empty() {
                tracing::info!(
                    count = missing_student_ids.len(),
                    "HEMIS ro'yxatida yo'q bo'lgan talabalar nofaol (active=false) qilinmoqda..."
                );
                let deactivated = UserRepository::bulk_set_users_active(pool, &missing_student_ids, false).await?;
                global_deactivated = deactivated as i64;
                tracing::warn!(
                    deactivated = global_deactivated,
                    "Bitirgan yoki o'qishdan ketgan talabalar muvaffaqiyatli nofaol qilindi"
                );
            }
        } else {
            tracing::warn!("⚠️ HEMIS dan talabalar ro'yxati olinmadi yoki bo'sh keldi. Xavfsizlik yuzasidan talabalarni nofaol qilish bekor qilindi!");
        }

        // ── Yakuniy xabar ──
        let final_message = if global_deactivated > 0 {
            format!(
                "Talabalar sinxronlash muvaffaqiyatli! {} ta yangi, {} ta yangilandi, {} ta nofaol qilindi (bitirganlar/ketganlar)",
                global_created, global_updated, global_deactivated
            )
        } else {
            format!(
                "Talabalar sinxronlash muvaffaqiyatli! {} ta yangi, {} ta yangilandi",
                global_created, global_updated
            )
        };

        let _ = tx
            .send(SyncProgressEvent {
                stage: "complete".into(),
                message: final_message.clone(),
                processed: global_processed,
                total: global_processed, // haqiqiy raqam
                created: global_created,
                updated: global_updated,
                deactivated: global_deactivated,
                current_page: total_pages,
                total_pages,
            })
            .await;

        tracing::info!(
            created = global_created,
            updated = global_updated,
            deactivated = global_deactivated,
            processed = global_processed,
            "Talabalar sinxronlash (streaming pipeline) tugadi"
        );

        Ok(SyncResponse {
            success: true,
            message: final_message,
            created: global_created,
            updated: global_updated,
            deactivated: global_deactivated,
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
        let mut global_deactivated: i64 = 0;
        let mut global_processed: i64 = 0;
        let mut all_hemis_active_emp_ids = std::collections::HashSet::new();

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
                    deactivated: global_deactivated,
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
                        deactivated: global_deactivated,
                        current_page: page,
                        total_pages,
                    })
                    .await;
                return Err(AppError::InternalError(err_msg));
            }

            let hemis_response: HemisEmployeeApiResponse = match response.json::<HemisEmployeeApiResponse>().await {
                Ok(data) => data,
                Err(e) => {
                    let err_msg = format!("HEMIS xodimlar javobini o'qishda (JSON) xatolik: {}", e);
                    let _ = tx
                        .send(SyncProgressEvent {
                            stage: "error".into(),
                            message: err_msg.clone(),
                            processed: global_processed,
                            total: total_items,
                            created: global_created,
                            updated: global_updated,
                            deactivated: global_deactivated,
                            current_page: page,
                            total_pages,
                        })
                        .await;
                    return Err(AppError::InternalError(err_msg));
                }
            };

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
                        deactivated: global_deactivated,
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

            let mut employees = hemis_response.data.items;

            // ── Yaroqsiz va takroriy (dublikat) xodimlarni tozalash ──
            let mut seen_emp_ids = std::collections::HashSet::new();
            employees.retain(|e| {
                if let Some(id) = &e.employee_id_number {
                    if !id.is_empty() && id != "0" && seen_emp_ids.insert(id.clone()) {
                        true
                    } else {
                        false
                    }
                } else {
                    false
                }
            });

            // ── Sahifadagi ID larni aniqlash va bazadan tekshirish ──
            let page_user_ids: Vec<String> = employees
                .iter()
                .filter_map(|e| e.employee_id_number.clone())
                .filter(|id| !id.is_empty() && id != "0")
                .collect();

            let existing_ids = UserRepository::find_existing_user_ids(pool, &page_user_ids).await?;

            let mut to_update = Vec::new();
            let mut to_create = Vec::new();

            for employee in employees {
                let user_id = match &employee.employee_id_number {
                    Some(id) if !id.is_empty() && id != "0" => id.clone(),
                    _ => continue,
                };

                // Xodim holati: "14" = bo'shagan, "11" (asosiy), "12" (ichki o'rindosh), "13" (tashqi o'rindosh) va null = faol
                let is_active = employee
                    .employee_status
                    .as_ref()
                    .and_then(|s| s.code.as_deref())
                    .map(|code| code != "14")
                    .unwrap_or(true);

                if is_active {
                    all_hemis_active_emp_ids.insert(user_id.clone());
                }

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
                // Faqat "employee" bo'lgandagina va bo'lim "AXBOROT RESURS MARKAZI" bo'lsa → "staff" (kutubxonachi)
                let actual_role = if role == "employee"
                    && department_name
                        .as_deref()
                        .map(|d| d.to_uppercase().contains("AXBOROT RESURS MARKAZ"))
                        .unwrap_or(false)
                {
                    "staff".to_string()
                } else {
                    role.to_string()
                };

                if existing_ids.contains(&user_id) {
                    to_update.push((
                        user_id,
                        actual_role,
                        full_name,
                        short_name,
                        birth_date,
                        department_name,
                        staff_position,
                        is_active,
                    ));
                } else {
                    let password_hash = AuthService::hash_password(&user_id)?;
                    to_create.push((
                        user_id,
                        password_hash,
                        actual_role,
                        full_name,
                        short_name,
                        birth_date,
                        department_name,
                        staff_position,
                        is_active,
                    ));
                }
            }

            // ── Ommaviy yangilash (Bulk Update) ──
            let updated_in_page = to_update.len() as i64;
            if !to_update.is_empty() {
                let update_data = to_update.iter().map(|e| {
                    (
                        e.0.as_str(),
                        e.1.as_str(),
                        e.2.as_str(),
                        e.3.as_deref(),
                        e.4,
                        None, // image_url
                        e.5.as_deref(),
                        e.6.as_deref(),
                        e.7,
                    )
                });
                UserRepository::bulk_update_employees(pool, update_data).await?;
            }

            // ── Ommaviy yaratish (Bulk Create) ──
            let created_in_page = to_create.len() as i64;
            if !to_create.is_empty() {
                let create_data = to_create.iter().map(|e| {
                    (
                        e.0.as_str(),
                        e.1.as_str(),
                        e.2.as_str(),
                        e.3.as_str(),
                        e.4.as_deref(),
                        e.5,
                        None, // image_url
                        e.6.as_deref(),
                        e.7.as_deref(),
                        e.8,
                    )
                });
                UserRepository::bulk_create_employees(pool, create_data).await?;
            }

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
                    deactivated: global_deactivated,
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
                role = role,
                "Xodimlar sahifasi qayta ishlandi (stream)"
            );

            if page >= total_pages {
                break;
            }
            page += 1;
        }

        // ── 2-bosqich: Solishtirish (Reconciliation) ──
        // HEMIS ro'yxatida bo'lmagan (ishdan bo'shagan) o'qituvchi yoki xodimlarni nofaol qilish
        // XAVFSIZLIK (Circuit Breaker): Faqat HEMIS dan kamida 1 ta faol xodim olingandagina solishtirish o'tkaziladi
        if !all_hemis_active_emp_ids.is_empty() && global_processed > 0 {
            let _ = tx
                .send(SyncProgressEvent {
                    stage: "processing".into(),
                    message: format!("{}: Ishdan bo'shagan xodimlar tekshirilmoqda...", label),
                    processed: global_processed,
                    total: total_items,
                    created: global_created,
                    updated: global_updated,
                    deactivated: global_deactivated,
                    current_page: total_pages,
                    total_pages,
                })
                .await;

            let target_roles: &[&str] = if role == "teacher" {
                &["teacher"]
            } else {
                &["employee"]
            };

            let db_active_emps = UserRepository::find_active_user_ids_by_roles(pool, target_roles).await?;
            let missing_emp_ids: Vec<String> = db_active_emps
                .into_iter()
                .filter(|id| {
                    !all_hemis_active_emp_ids.contains(id)
                        && id != &config.admin_login
                        && id != "admin"
                        && id != "superadmin"
                })
                .collect();

            if !missing_emp_ids.is_empty() {
                tracing::info!(
                    count = missing_emp_ids.len(),
                    role = role,
                    "HEMIS ro'yxatida yo'q bo'lgan xodimlar nofaol (active=false) qilinmoqda..."
                );
                let deactivated = UserRepository::bulk_set_users_active(pool, &missing_emp_ids, false).await?;
                global_deactivated = deactivated as i64;
                tracing::warn!(
                    deactivated = global_deactivated,
                    role = role,
                    "Ishdan bo'shagan xodimlar muvaffaqiyatli nofaol qilindi"
                );
            }
        } else {
            tracing::warn!(
                role = role,
                "⚠️ HEMIS dan xodimlar ro'yxati olinmadi yoki bo'sh keldi. Xavfsizlik yuzasidan xodimlarni nofaol qilish bekor qilindi!"
            );
        }

        // Yakuniy xabar
        let final_message = if global_deactivated > 0 {
            format!(
                "{} sinxronlash muvaffaqiyatli! {} ta yangi, {} ta yangilandi, {} ta nofaol qilindi (bo'shaganlar)",
                label, global_created, global_updated, global_deactivated
            )
        } else {
            format!(
                "{} sinxronlash muvaffaqiyatli! {} ta yangi, {} ta yangilandi",
                label, global_created, global_updated
            )
        };

        let _ = tx
            .send(SyncProgressEvent {
                stage: "complete".into(),
                message: final_message.clone(),
                processed: global_processed,
                total: global_processed,
                created: global_created,
                updated: global_updated,
                deactivated: global_deactivated,
                current_page: total_pages,
                total_pages,
            })
            .await;

        tracing::info!(
            created = global_created,
            updated = global_updated,
            deactivated = global_deactivated,
            processed = global_processed,
            role = role,
            "{} sinxronlash (streaming pipeline) tugadi",
            label
        );

        Ok(SyncResponse {
            success: true,
            message: final_message,
            created: global_created,
            updated: global_updated,
            deactivated: global_deactivated,
            total: global_processed,
        })
    }

    /// ═══════════════════════════════════════════════════════════════
    /// HAFTALIK: Barcha talaba va xodimlar statusini tekshirish
    /// - Statusi o'zgargan (o'qishdan ketgan/bo'shagan) larni nofaol (active=false) qilish
    /// - Agar nomida qaytarilmagan kitob bo'lsa, barcha admin va kutubxonachilarga ogohlantirish yuborish
    /// ═══════════════════════════════════════════════════════════════
    #[allow(unused_assignments)]
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
        let mut hemis_active_student_ids = std::collections::HashSet::new();
        let mut student_sync_ok = true;

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
                    match response.json::<HemisApiResponse>().await {
                        Ok(api_res) => {
                            total_pages = api_res.data.pagination.page_count;
                            for student in api_res.data.items {
                                if let Some(uid) = student.student_id_number.as_deref().filter(|s| !s.is_empty()) {
                                    if uid == config.admin_login || uid == "admin" || uid == "superadmin" {
                                        continue;
                                    }
                                    checked_students += 1;

                                    // studentStatus tekshiruvi: "14" = Chetlashtirilgan, "15" = Bitirgan
                                    let is_active_in_hemis = student.student_status
                                        .as_ref()
                                        .and_then(|s| s.code.as_deref())
                                        .map(|code| code != "14" && code != "15")
                                        .unwrap_or(true);

                                    if !is_active_in_hemis {
                                        if let Ok(was_changed) = UserRepository::set_user_active(pool, uid, false).await {
                                            if was_changed {
                                                deactivated_count += 1;
                                                let actual_role = if let Ok(Some(u)) = UserRepository::find_by_user_id_any(pool, uid).await {
                                                    if u.role == "admin" {
                                                        tracing::info!(student_id = %uid, "Admin sifatida belgilangan talaba HEMIS bo'yicha nofaol qilindi (roli 'admin' saqlab qolindi)");
                                                    }
                                                    u.role
                                                } else {
                                                    "student".to_string()
                                                };
                                                tracing::warn!(student_id = %uid, role = %actual_role, "Talaba HEMIS da nofaol bo'lgani sababli nofaol qilindi");

                                                if let Ok(unreturned_books) = RentalRepository::get_unreturned_books_by_user_id(pool, uid).await {
                                                    if !unreturned_books.is_empty() {
                                                        users_with_debt.push(UserDebtSummary {
                                                            user_id: uid.to_string(),
                                                            full_name: student.full_name.clone().unwrap_or_else(|| "Noma'lum".to_string()),
                                                            role: actual_role,
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
                                        hemis_active_student_ids.insert(uid.to_string());
                                        let _ = UserRepository::set_user_active(pool, uid, true).await;
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            tracing::error!(page = page, error = %e, "Talabalar javobini parse qilishda xatolik");
                            student_sync_ok = false;
                            break;
                        }
                    }
                }
                Ok(resp) => {
                    tracing::error!(page = page, status = %resp.status(), "Talabalar sahifasini olishda HTTP xatosi");
                    student_sync_ok = false;
                    break;
                }
                Err(e) => {
                    tracing::error!(page = page, error = %e, "Talabalar sahifasini olishda tarmoq xatosi");
                    student_sync_ok = false;
                    break;
                }
            }

            if page >= total_pages {
                break;
            }
            page += 1;
        }

        // 1.1. HEMIS ro'yxatida umuman bo'lmagan (bitirgan / ketgan) talabalarni aniqlash va nofaol qilish
        // XAVFSIZLIK (Circuit Breaker): Faqat talabalar ro'yxati xatosiz va to'liq olingandagina solishtirish o'tkaziladi
        if student_sync_ok && checked_students > 0 && !hemis_active_student_ids.is_empty() {
            if let Ok(db_active_students) = UserRepository::find_active_user_ids_by_role(pool, "student").await {
                let missing_students: Vec<String> = db_active_students
                    .into_iter()
                    .filter(|id| {
                        !hemis_active_student_ids.contains(id)
                            && id != &config.admin_login
                            && id != "admin"
                            && id != "superadmin"
                    })
                    .collect();

                if !missing_students.is_empty() {
                    tracing::info!(
                        count = missing_students.len(),
                        "Haftalik tekshiruv: HEMIS ro'yxatida yo'q bo'lgan talabalar (bitiruvchilar) tekshirilmoqda..."
                    );

                    for uid in &missing_students {
                        if let Ok(was_changed) = UserRepository::set_user_active(pool, uid, false).await {
                            if was_changed {
                                deactivated_count += 1;
                                let user_opt = UserRepository::find_by_user_id_any(pool, uid).await.unwrap_or(None);
                                let full_name = user_opt.as_ref().map(|u| u.full_name.clone()).unwrap_or_else(|| "Noma'lum".to_string());
                                let dept = user_opt.as_ref().and_then(|u| u.department_name.clone());
                                let group = user_opt.as_ref().and_then(|u| u.group_name.clone());
                                let phone = user_opt.as_ref().and_then(|u| u.phone.clone());

                                tracing::warn!(student_id = %uid, full_name = %full_name, "Talaba HEMIS ro'yxatida bo'lmagani (bitirgan) sababli nofaol qilindi");

                                if let Ok(unreturned_books) = RentalRepository::get_unreturned_books_by_user_id(pool, uid).await {
                                    if !unreturned_books.is_empty() {
                                        users_with_debt.push(UserDebtSummary {
                                            user_id: uid.clone(),
                                            full_name,
                                            role: "student".to_string(),
                                            department: dept,
                                            group_or_position: group,
                                            phone,
                                            books: unreturned_books,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else if !student_sync_ok {
            tracing::warn!("⚠️ Talabalar ro'yxatini HEMIS dan olishda xatolik bo'lgani sababli bitiruvchilarni nofaol qilish bekor qilindi (xavfsizlik himoyasi)");
        }

        // 2. O'QITUVCHILAR VA XODIMLAR STATUSINI TEKSHIRISH
        // HEMIS API da o'qituvchilar (type=teacher) va boshqaruv/xizmat xodimlari (type=employee) alohida saqlanadi.
        let emp_configs: [(&str, &str, &[&str]); 2] = [
            ("teacher", "O'qituvchilar", &["teacher"]),
            ("employee", "Xodimlar", &["employee"]),
        ];

        for (emp_type, emp_label, target_roles) in emp_configs {
            let mut emp_page: i64 = 1;
            let mut emp_total_pages: i64 = 1;
            let mut hemis_active_ids = std::collections::HashSet::new();
            let mut emp_type_sync_ok = true;
            let mut checked_in_type: i64 = 0;

            loop {
                let url = format!(
                    "{}/rest/v1/data/employee-list?type={}&page={}&limit={}",
                    config.hemis_base_url, emp_type, emp_page, page_size
                );

                let res = client
                    .get(&url)
                    .header("Authorization", format!("Bearer {}", config.hemis_token))
                    .send()
                    .await;

                match res {
                    Ok(response) if response.status().is_success() => {
                        match response.json::<HemisEmployeeApiResponse>().await {
                            Ok(api_res) => {
                                emp_total_pages = api_res.data.pagination.page_count;
                                for emp in api_res.data.items {
                                    if let Some(uid) = emp.employee_id_number.as_deref().filter(|s| !s.is_empty()) {
                                        if uid == config.admin_login || uid == "admin" || uid == "superadmin" {
                                            continue;
                                        }
                                        checked_employees += 1;
                                        checked_in_type += 1;

                                        // employeeStatus tekshiruvi: "14" = Bo'shagan, "11" (asosiy), "12" (ichki o'rindosh), "13" (tashqi o'rindosh) va null = faol
                                        let is_active_in_hemis = emp.employee_status
                                            .as_ref()
                                            .and_then(|s| s.code.as_deref())
                                            .map(|code| code != "14")
                                            .unwrap_or(true);

                                        if !is_active_in_hemis {
                                            if let Ok(was_changed) = UserRepository::set_user_active(pool, uid, false).await {
                                                if was_changed {
                                                    deactivated_count += 1;
                                                    let actual_role = if let Ok(Some(u)) = UserRepository::find_by_user_id_any(pool, uid).await {
                                                        if u.role == "admin" {
                                                            tracing::info!(employee_id = %uid, "Admin sifatida belgilangan xodim HEMIS bo'yicha nofaol qilindi (roli 'admin' saqlab qolindi)");
                                                        }
                                                        u.role
                                                    } else {
                                                        emp_type.to_string()
                                                    };
                                                    tracing::warn!(employee_id = %uid, role = %actual_role, "{} HEMIS da ishdan bo'shagani sababli nofaol qilindi", emp_label);

                                                    if let Ok(unreturned_books) = RentalRepository::get_unreturned_books_by_user_id(pool, uid).await {
                                                        if !unreturned_books.is_empty() {
                                                            users_with_debt.push(UserDebtSummary {
                                                                user_id: uid.to_string(),
                                                                full_name: emp.full_name.clone().unwrap_or_else(|| "Noma'lum".to_string()),
                                                                role: actual_role,
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
                                            hemis_active_ids.insert(uid.to_string());
                                            let _ = UserRepository::set_user_active(pool, uid, true).await;
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                tracing::error!(emp_type, page = emp_page, error = %e, "{} javobini parse qilishda xatolik", emp_label);
                                emp_type_sync_ok = false;
                                break;
                            }
                        }
                    }
                    Ok(resp) => {
                        tracing::error!(emp_type, page = emp_page, status = %resp.status(), "{} sahifasini olishda HTTP xatosi", emp_label);
                        emp_type_sync_ok = false;
                        break;
                    }
                    Err(e) => {
                        tracing::error!(emp_type, page = emp_page, error = %e, "{} sahifasini olishda tarmoq xatosi", emp_label);
                        emp_type_sync_ok = false;
                        break;
                    }
                }

                if emp_page >= emp_total_pages {
                    break;
                }
                emp_page += 1;
            }

            // 2.1. HEMIS ro'yxatida umuman bo'lmagan (ishdan bo'shagan) xodimlarni aniqlash va nofaol qilish
            // XAVFSIZLIK (Circuit Breaker):
            // Faqat HEMIS dan sahifalar muvaffaqiyatli olingan va kamida 1 ta xodim topilgandagina solishtirish o'tkaziladi.
            if emp_type_sync_ok && checked_in_type > 0 && !hemis_active_ids.is_empty() {
                if let Ok(db_active_emps) = UserRepository::find_active_user_ids_by_roles(pool, target_roles).await {
                    let missing_emps: Vec<String> = db_active_emps
                        .into_iter()
                        .filter(|id| {
                            !hemis_active_ids.contains(id)
                                && id != &config.admin_login
                                && id != "admin"
                                && id != "superadmin"
                        })
                        .collect();

                    if !missing_emps.is_empty() {
                        tracing::info!(
                            count = missing_emps.len(),
                            emp_type,
                            "Haftalik tekshiruv: HEMIS ro'yxatida yo'q bo'lgan {} (bo'shaganlar) tekshirilmoqda...",
                            emp_label
                        );

                        for uid in &missing_emps {
                            let user_opt = UserRepository::find_by_user_id_any(pool, uid).await.unwrap_or(None);
                            let actual_role = user_opt.as_ref().map(|u| u.role.clone()).unwrap_or_else(|| emp_type.to_string());
                            if actual_role == "admin" || actual_role == "staff" {
                                continue;
                            }

                            if let Ok(was_changed) = UserRepository::set_user_active(pool, uid, false).await {
                                if was_changed {
                                    deactivated_count += 1;
                                    let full_name = user_opt.as_ref().map(|u| u.full_name.clone()).unwrap_or_else(|| "Noma'lum".to_string());
                                    let dept = user_opt.as_ref().and_then(|u| u.department_name.clone());
                                    let position = user_opt.as_ref().and_then(|u| u.staff_position.clone());
                                    let phone = user_opt.as_ref().and_then(|u| u.phone.clone());

                                    tracing::warn!(employee_id = %uid, full_name = %full_name, role = %actual_role, "{} HEMIS ro'yxatida bo'lmagani (bo'shagan) sababli nofaol qilindi", emp_label);

                                    if let Ok(unreturned_books) = RentalRepository::get_unreturned_books_by_user_id(pool, uid).await {
                                        if !unreturned_books.is_empty() {
                                            users_with_debt.push(UserDebtSummary {
                                                user_id: uid.clone(),
                                                full_name,
                                                role: actual_role,
                                                department: dept,
                                                group_or_position: position,
                                                phone,
                                                books: unreturned_books,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else if !emp_type_sync_ok {
                tracing::warn!(
                    emp_type,
                    "⚠️ {} ro'yxatini HEMIS dan olishda xatolik yuz bergani sababli xodimlarni nofaol qilish bekor qilindi (xavfsizlik himoyasi)",
                    emp_label
                );
            }
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

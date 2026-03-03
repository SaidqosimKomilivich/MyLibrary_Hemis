use sqlx::PgPool;
use tokio::sync::mpsc;

use crate::config::Config;
use crate::dto::hemis::{
    HemisApiResponse, HemisEmployeeApiResponse, HemisEmployeeItem, HemisStudentItem, SyncResponse,
};
use crate::errors::AppError;
use crate::repository::user_repository::UserRepository;
use crate::services::auth_service::AuthService;

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
    /// HEMIS API dan talabalar ro'yxatini olish (barcha sahifalar) — eski usul
    pub async fn fetch_all_students(config: &Config) -> Result<Vec<HemisStudentItem>, AppError> {
        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(config.hemis_skip_ssl)
            .build()
            .map_err(|e| {
                AppError::InternalError(format!("HTTP client yaratishda xatolik: {}", e))
            })?;

        let mut all_students: Vec<HemisStudentItem> = Vec::new();
        let mut page = 1;
        let page_size = 200;

        loop {
            let url = format!(
                "{}/rest/v1/data/student-list?page={}&limit={}",
                config.hemis_base_url, page, page_size
            );

            tracing::info!(page = page, "HEMIS API dan talabalar olinmoqda...");

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
                return Err(AppError::InternalError(format!(
                    "HEMIS API xatosi: {} - {}",
                    status, body
                )));
            }

            let hemis_response: HemisApiResponse = response.json().await.map_err(|e| {
                AppError::InternalError(format!("HEMIS javobini parse qilishda xatolik: {}", e))
            })?;

            if !hemis_response.success {
                return Err(AppError::InternalError(
                    "HEMIS API success: false qaytardi".to_string(),
                ));
            }

            let items_count = hemis_response.data.items.len();
            let total_pages = hemis_response.data.pagination.page_count;

            all_students.extend(hemis_response.data.items);

            tracing::info!(
                page = page,
                total_pages = total_pages,
                items_in_page = items_count,
                total_fetched = all_students.len(),
                "Talabalar sahifasi olindi"
            );

            if page >= total_pages {
                break;
            }
            page += 1;
        }

        tracing::info!(
            total = all_students.len(),
            "HEMIS API dan barcha talabalar olindi"
        );
        Ok(all_students)
    }

    /// HEMIS talabalarini bazaga sinxronlash (eski — bir yo'la)
    pub async fn sync_students(pool: &PgPool, config: &Config) -> Result<SyncResponse, AppError> {
        let (tx, _rx) = mpsc::channel::<SyncProgressEvent>(16);
        Self::sync_students_stream(pool, config, tx).await
    }

    /// ═══════════════════════════════════════════════════════════════
    /// YANGI: Oqimli (Streaming Pipeline) talabalar sinxronlashi
    /// Har bir HEMIS sahifasi yuklanishi bilan darhol qayta ishlanadi,
    /// bazaga yoziladi va xotiradan tozalanadi.
    /// Progress xabarlari `tx` kanali orqali SSE ga uzatiladi.
    /// ═══════════════════════════════════════════════════════════════
    pub async fn sync_students_stream(
        pool: &PgPool,
        config: &Config,
        tx: mpsc::Sender<SyncProgressEvent>,
    ) -> Result<SyncResponse, AppError> {
        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(config.hemis_skip_ssl)
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
                    (
                        s.student_id_number.as_deref().unwrap(),
                        s.full_name.as_deref().unwrap_or("Noma'lum"),
                        s.short_name.as_deref(),
                        s.birth_date.and_then(|ts| {
                            chrono::DateTime::from_timestamp(ts, 0).map(|dt| dt.date_naive())
                        }),
                        s.image.as_deref().filter(|st| !st.is_empty()),
                        s.email.as_deref().filter(|st| !st.is_empty()),
                        s.id,
                        s.department.as_ref().and_then(|d| d.name.as_deref()),
                        s.specialty.as_ref().and_then(|sp| sp.name.as_deref()),
                        s.group.as_ref().and_then(|g| g.name.as_deref()),
                        s.education_form.as_ref().and_then(|e| e.name.as_deref()),
                    )
                });
                UserRepository::bulk_update_students(pool, update_data).await?;
            }

            // ── Yaratish (hash + bulk insert) ──
            let created_in_page = to_create.len() as i64;

            // to_create ni Vec<Vec<..>> ga bo'lib olamiz (Send xavfsiz)
            let create_chunks: Vec<Vec<HemisStudentItem>> =
                to_create.chunks(500).map(|c| c.to_vec()).collect();

            for chunk_data in create_chunks {
                // CPU-intensiv: parollarni parallel heshlash
                let mut hash_tasks = Vec::new();
                for student in chunk_data {
                    hash_tasks.push(tokio::task::spawn_blocking(move || {
                        let user_id = student.student_id_number.clone().unwrap();
                        let hash_result = AuthService::hash_password(&user_id);
                        (student, hash_result)
                    }));
                }
                let results = futures_util::future::join_all(hash_tasks).await;

                let mut batch_to_insert = Vec::new();
                for res in results {
                    if let Ok((student, Ok(password_hash))) = res {
                        batch_to_insert.push((student, password_hash));
                    } else {
                        tracing::error!("Parolni heshlashda xatolik!");
                    }
                }

                // Bulk insert
                let insert_data = batch_to_insert.iter().map(|(s, hash)| {
                    (
                        s.student_id_number.as_deref().unwrap(),
                        hash.as_str(),
                        s.full_name.as_deref().unwrap_or("Noma'lum"),
                        s.short_name.as_deref(),
                        s.birth_date.and_then(|ts| {
                            chrono::DateTime::from_timestamp(ts, 0).map(|dt| dt.date_naive())
                        }),
                        s.image.as_deref().filter(|st| !st.is_empty()),
                        s.email.as_deref().filter(|st| !st.is_empty()),
                        s.id,
                        s.department.as_ref().and_then(|d| d.name.as_deref()),
                        s.specialty.as_ref().and_then(|sp| sp.name.as_deref()),
                        s.group.as_ref().and_then(|g| g.name.as_deref()),
                        s.education_form.as_ref().and_then(|e| e.name.as_deref()),
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

    // ========================
    // O'qituvchi / Xodim sinxronlash
    // ========================

    /// HEMIS API dan xodimlar ro'yxatini olish (barcha sahifalar)
    /// type_filter: "teacher", "employee", yoki "all"
    pub async fn fetch_all_employees(
        config: &Config,
        type_filter: &str,
    ) -> Result<Vec<HemisEmployeeItem>, AppError> {
        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(config.hemis_skip_ssl)
            .build()
            .map_err(|e| {
                AppError::InternalError(format!("HTTP client yaratishda xatolik: {}", e))
            })?;

        let mut all_employees: Vec<HemisEmployeeItem> = Vec::new();
        let mut page = 1;
        let page_size = 200;

        loop {
            let url = format!(
                "{}/rest/v1/data/employee-list?type={}&page={}&limit={}",
                config.hemis_base_url, type_filter, page, page_size
            );

            tracing::info!(
                page = page,
                type_filter = type_filter,
                "HEMIS API dan xodimlar olinmoqda..."
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
                return Err(AppError::InternalError(format!(
                    "HEMIS Employee API xatosi: {} - {}",
                    status, body
                )));
            }

            let hemis_response: HemisEmployeeApiResponse = response.json().await.map_err(|e| {
                AppError::InternalError(format!(
                    "HEMIS Employee javobini parse qilishda xatolik: {}",
                    e
                ))
            })?;

            if !hemis_response.success {
                return Err(AppError::InternalError(
                    "HEMIS Employee API success: false qaytardi".to_string(),
                ));
            }

            let items_count = hemis_response.data.items.len();
            let total_pages = hemis_response.data.pagination.page_count;

            all_employees.extend(hemis_response.data.items);

            tracing::info!(
                page = page,
                total_pages = total_pages,
                items_in_page = items_count,
                total_fetched = all_employees.len(),
                "Xodimlar sahifasi olindi"
            );

            if page >= total_pages {
                break;
            }
            page += 1;
        }

        tracing::info!(
            total = all_employees.len(),
            type_filter = type_filter,
            "HEMIS API dan barcha xodimlar olindi"
        );
        Ok(all_employees)
    }

    /// HEMIS xodimlarini bazaga sinxronlash (eski — bir yo'la)
    /// role: "teacher" yoki "staff"
    /// type_filter: HEMIS API uchun "teacher", "employee", yoki "all"
    pub async fn sync_employees(
        pool: &PgPool,
        config: &Config,
        type_filter: &str,
        role: &str,
    ) -> Result<SyncResponse, AppError> {
        let (tx, _rx) = mpsc::channel::<SyncProgressEvent>(16);
        Self::sync_employees_stream(pool, config, type_filter, role, tx).await
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
                // Faqat ishlayotgan xodimlarni olish (employeeStatus.code = "11")
                let is_active = employee
                    .employee_status
                    .as_ref()
                    .and_then(|s| s.code.as_deref())
                    .map(|code| code == "11")
                    .unwrap_or(false);

                if !is_active {
                    continue;
                }

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

                let image_url = employee.image.clone().filter(|s| !s.is_empty());
                let id_card = employee.id;

                let department_name = employee.department.as_ref().and_then(|d| d.name.clone());
                let staff_position = employee
                    .staff_position
                    .as_ref()
                    .and_then(|s| s.name.clone());

                // Rolni department ga qarab aniqlash:
                // "AXBOROT RESURS MARKAZI" → "staff" (kutubxonachi), qolganlari → "employee"
                let actual_role = if department_name
                    .as_deref()
                    .map(|d| d.to_uppercase().contains("AXBOROT RESURS MARKAZ"))
                    .unwrap_or(false)
                {
                    "staff"
                } else {
                    "employee"
                };

                let existing = UserRepository::find_by_user_id(pool, &user_id).await?;

                if existing.is_some() {
                    UserRepository::update_employee_info(
                        pool,
                        &user_id,
                        &full_name,
                        short_name.as_deref(),
                        birth_date,
                        image_url.as_deref(),
                        id_card,
                        department_name.as_deref(),
                        staff_position.as_deref(),
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
                        image_url.as_deref(),
                        id_card,
                        department_name.as_deref(),
                        staff_position.as_deref(),
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
}

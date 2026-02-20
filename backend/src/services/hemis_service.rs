use sqlx::PgPool;

use crate::config::Config;
use crate::dto::hemis::{
    HemisApiResponse, HemisEmployeeApiResponse, HemisEmployeeItem, HemisStudentItem, SyncResponse,
};
use crate::errors::AppError;
use crate::repository::user_repository::UserRepository;
use crate::services::auth_service::AuthService;

pub struct HemisService;

impl HemisService {
    /// HEMIS API dan talabalar ro'yxatini olish (barcha sahifalar)
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

    /// HEMIS talabalarini bazaga sinxronlash
    pub async fn sync_students(pool: &PgPool, config: &Config) -> Result<SyncResponse, AppError> {
        let students = Self::fetch_all_students(config).await?;
        let total = students.len() as i64;

        let mut created: i64 = 0;
        let mut updated: i64 = 0;

        for student in &students {
            let user_id = match &student.student_id_number {
                Some(id) if !id.is_empty() => id.clone(),
                _ => {
                    tracing::warn!(
                        hemis_id = student.id,
                        "Talabaning student_id_number bo'sh, o'tkazildi"
                    );
                    continue;
                }
            };

            let full_name = student
                .full_name
                .clone()
                .unwrap_or_else(|| "Noma'lum".to_string());
            let short_name = student.short_name.clone();

            let birth_date = student
                .birth_date
                .and_then(|ts| chrono::DateTime::from_timestamp(ts, 0).map(|dt| dt.date_naive()));

            let image_url = student.image.clone().filter(|s| !s.is_empty());
            let email = student.email.clone().filter(|s| !s.is_empty());
            let id_card = student.id;

            let department_name = student.department.as_ref().and_then(|d| d.name.clone());
            let specialty_name = student.specialty.as_ref().and_then(|s| s.name.clone());
            let group_name = student.group.as_ref().and_then(|g| g.name.clone());
            let education_form = student.education_form.as_ref().and_then(|e| e.name.clone());

            let existing = UserRepository::find_by_user_id(pool, &user_id).await?;

            if existing.is_some() {
                UserRepository::update_student_info(
                    pool,
                    &user_id,
                    &full_name,
                    short_name.as_deref(),
                    birth_date,
                    image_url.as_deref(),
                    email.as_deref(),
                    id_card,
                    department_name.as_deref(),
                    specialty_name.as_deref(),
                    group_name.as_deref(),
                    education_form.as_deref(),
                )
                .await?;
                updated += 1;
            } else {
                let password_hash = AuthService::hash_password(&user_id)?;

                UserRepository::create_student(
                    pool,
                    &user_id,
                    &password_hash,
                    &full_name,
                    short_name.as_deref(),
                    birth_date,
                    image_url.as_deref(),
                    email.as_deref(),
                    id_card,
                    department_name.as_deref(),
                    specialty_name.as_deref(),
                    group_name.as_deref(),
                    education_form.as_deref(),
                )
                .await?;
                created += 1;
            }
        }

        tracing::info!(
            created = created,
            updated = updated,
            total = total,
            "Talabalar sinxronlash tugadi"
        );

        Ok(SyncResponse {
            success: true,
            message: format!(
                "Talabalar sinxronlash muvaffaqiyatli! {} ta yangi, {} ta yangilandi",
                created, updated
            ),
            created,
            updated,
            total,
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

    /// HEMIS xodimlarini bazaga sinxronlash
    /// role: "teacher" yoki "staff"
    /// type_filter: HEMIS API uchun "teacher", "employee", yoki "all"
    pub async fn sync_employees(
        pool: &PgPool,
        config: &Config,
        type_filter: &str,
        role: &str,
    ) -> Result<SyncResponse, AppError> {
        let employees = Self::fetch_all_employees(config, type_filter).await?;
        let total = employees.len() as i64;

        let mut created: i64 = 0;
        let mut updated: i64 = 0;

        for employee in &employees {
            // employee_id_number dan user_id olish
            let user_id = match &employee.employee_id_number {
                Some(id) if !id.is_empty() && id != "0" => id.clone(),
                _ => {
                    tracing::warn!(
                        hemis_id = employee.id,
                        "Xodimning employee_id_number bo'sh, o'tkazildi"
                    );
                    continue;
                }
            };

            let full_name = employee
                .full_name
                .clone()
                .unwrap_or_else(|| "Noma'lum".to_string());
            let short_name = employee.short_name.clone();

            let birth_date = employee
                .birth_date
                .and_then(|ts| chrono::DateTime::from_timestamp(ts, 0).map(|dt| dt.date_naive()));

            let image_url = employee.image.clone().filter(|s| !s.is_empty());
            let id_card = employee.id;

            let department_name = employee.department.as_ref().and_then(|d| d.name.clone());
            let staff_position = employee
                .staff_position
                .as_ref()
                .and_then(|s| s.name.clone());

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
                updated += 1;
            } else {
                let password_hash = AuthService::hash_password(&user_id)?;

                UserRepository::create_employee(
                    pool,
                    &user_id,
                    &password_hash,
                    role,
                    &full_name,
                    short_name.as_deref(),
                    birth_date,
                    image_url.as_deref(),
                    id_card,
                    department_name.as_deref(),
                    staff_position.as_deref(),
                )
                .await?;
                created += 1;
            }
        }

        let label = if role == "teacher" {
            "O'qituvchilar"
        } else {
            "Xodimlar"
        };

        tracing::info!(
            created = created,
            updated = updated,
            total = total,
            role = role,
            "{} sinxronlash tugadi",
            label
        );

        Ok(SyncResponse {
            success: true,
            message: format!(
                "{} sinxronlash muvaffaqiyatli! {} ta yangi, {} ta yangilandi",
                label, created, updated
            ),
            created,
            updated,
            total,
        })
    }
}

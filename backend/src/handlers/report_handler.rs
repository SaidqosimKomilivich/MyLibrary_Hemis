use actix_web::{web, HttpResponse};
use chrono::{Local, NaiveDate};
use sqlx::PgPool;
use rust_xlsxwriter::{Workbook, Format};

use crate::dto::report::{ReportDashboardResponse, ReportExportParams, AdminDashboardResponse};
use crate::errors::AppError;
use crate::middleware::auth_middleware::{self, Claims};
use crate::repository::report_repository::ReportRepository;

/// GET /api/reports/dashboard
/// Oxirgi keldi-ketdi va ijara ma'lumotlarini qisqacha qaytarish (faqat admin).
pub async fn get_dashboard(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    let p = pool.get_ref();
    
    // 10 tadan oxirgi yozuvlar
    let recent_rentals = ReportRepository::get_recent_rentals(p, 10).await?;
    let recent_controls = ReportRepository::get_recent_controls(p, 10).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": ReportDashboardResponse {
            recent_rentals,
            recent_controls,
        }
    })))
}

#[derive(serde::Deserialize)]
pub struct AdminDashboardQuery {
    pub year: Option<i32>,
    pub month: Option<u32>,
}

/// GET /api/reports/admin-dashboard
/// Admin dashboard uchun batafsil statistika (KPI, Diagramma, Oxirgi faoliyat)
pub async fn get_admin_dashboard(
    pool: web::Data<PgPool>,
    claims: Claims,
    query: web::Query<AdminDashboardQuery>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    let p = pool.get_ref();
    let q = query.into_inner();
    
    let now = Local::now().date_naive();
    let year = q.year.unwrap_or_else(|| now.format("%Y").to_string().parse().unwrap_or(2025));
    let month = q.month.unwrap_or_else(|| now.format("%m").to_string().parse().unwrap_or(1));

    let (total_users, total_books, active_rentals, overdue_rentals, pending_requests) = 
        ReportRepository::get_dashboard_kpis(p, year, month).await?;
        
    let chart_data = ReportRepository::get_dashboard_chart(p, year, month).await?;
    let recent_activities = ReportRepository::get_dashboard_activities(p, year, month, 10).await?;

    let (books_by_category, books_by_language) = ReportRepository::get_dashboard_book_stats(p).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": AdminDashboardResponse {
            total_users,
            total_books,
            active_rentals,
            overdue_rentals,
            pending_requests,
            chart_data,
            recent_activities,
            books_by_category,
            books_by_language,
        }
    })))
}

/// GET /api/reports/my-dashboard
/// Foydalanuvchining shaxsiy dashboardi (KPI va Oxirgi faoliyatlar)
pub async fn get_my_dashboard(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    let p = pool.get_ref();
    let user_uuid = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Noto'g'ri foydalanuvchi ID".into()))?;

    let user = crate::repository::user_repository::UserRepository::find_by_id(p, user_uuid)
        .await?
        .ok_or_else(|| AppError::NotFound("Foydalanuvchi topilmadi".into()))?;

    let (active_rentals, overdue_rentals, total_read, pending_requests) = 
        ReportRepository::get_my_dashboard_kpis(p, &user.user_id, user.id).await?;
        
    let recent_activities = ReportRepository::get_my_activities(p, &user.user_id, 10).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": crate::dto::report::MyDashboardResponse {
            active_rentals,
            overdue_rentals,
            total_read,
            pending_requests,
            recent_activities,
        }
    })))
}

/// GET /api/reports/employee-dashboard
/// Librarian/Xodim dashboardi (Bugungi statistika, Qaytarilishi kerak bo'lganlar, Mashhur kitoblar)
pub async fn get_employee_dashboard(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["employee", "staff", "admin"]) {
        return Ok(resp);
    }

    let p = pool.get_ref();
    let dashboard_data = ReportRepository::get_employee_dashboard(p).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": dashboard_data
    })))
}

/// GET /api/reports/public-stats
/// Umumiy Bosh sahifa (Landing) uchun ochiq statistika
pub async fn get_public_stats(
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let p = pool.get_ref();
    let stats_data = ReportRepository::get_public_stats(p).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": stats_data
    })))
}

/// GET /api/reports/export
/// Oraliqni tanlab, Excel formatida (.xlsx) yuklab beradigan endpoint (faqat admin).
pub async fn export_excel(
    pool: web::Data<PgPool>,
    claims: Claims,
    query: web::Query<ReportExportParams>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    let params = query.into_inner();
    
    // Default joriy kunni belgilaymiz parametrlar bo'lmasa
    let today = Local::now().date_naive();
    
    let start_date = match &params.start_date {
        Some(d) => NaiveDate::parse_from_str(d, "%Y-%m-%d")
            .unwrap_or(today),
        None => today,
    };

    let end_date = match &params.end_date {
        Some(d) => NaiveDate::parse_from_str(d, "%Y-%m-%d")
            .unwrap_or(today),
        None => today,
    };

    let p = pool.get_ref();
    let is_rentals = params.report_type == "rentals";
    let is_controls = params.report_type == "controls";
    let is_submissions = params.report_type == "submissions";
    let is_users = params.report_type == "users_statistics";
    let is_inventory = params.report_type == "book_inventory";
    let is_overdue = params.report_type == "overdue_rentals";
    let is_requests = params.report_type == "book_requests";
    let is_gate = params.report_type == "gate_control";
    let is_staff_book_counts = params.report_type == "staff_book_counts";

    // 1. Data fetching and checking
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    
    // Formatlar
    let header_format = Format::new().set_bold().set_background_color(rust_xlsxwriter::Color::Gray);

    if is_rentals {
        let data = ReportRepository::get_rentals_by_date(p, start_date, end_date).await?;
        
        if data.is_empty() {
            return Err(AppError::NotFound("Tanlangan kunlar oralig'ida ijara ma'lumotlari topilmadi".into()));
        }

        // Sarlavhalar
        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "To'liq ism", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "Rol", &header_format);
        let _ = worksheet.write_string_with_format(0, 3, "Lavozim / Guruh", &header_format);
        let _ = worksheet.write_string_with_format(0, 4, "Kitob", &header_format);
        let _ = worksheet.write_string_with_format(0, 5, "Berilgan sana", &header_format);
        let _ = worksheet.write_string_with_format(0, 6, "Qaytarish muddati", &header_format);
        let _ = worksheet.write_string_with_format(0, 7, "Haqiqiy qaytargan sana", &header_format);
        let _ = worksheet.write_string_with_format(0, 8, "Holati", &header_format);

        // Ma'lumotlar
        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;
            let role_str = row.role.as_deref().unwrap_or("-");
            let role_display = match role_str {
                "student" => "Talaba",
                "employee" => "Xodim",
                "teacher" => "O'qituvchi",
                "admin" => "Administrator",
                _ => role_str,
            };
            
            let pos_display = if role_str == "student" {
                format!("{} {}", 
                    row.department_name.as_deref().unwrap_or(""), 
                    row.group_name.as_deref().unwrap_or("")
                ).trim().to_string()
            } else {
                row.staff_position.clone().unwrap_or_else(|| "-".to_string())
            };
            let pos_display = if pos_display.is_empty() { "-".to_string() } else { pos_display };

            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, row.user_full_name.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 2, role_display);
            let _ = worksheet.write_string(row_idx, 3, &pos_display);
            let _ = worksheet.write_string(row_idx, 4, row.book_title.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 5, &row.loan_date);
            let _ = worksheet.write_string(row_idx, 6, &row.due_date);
            let _ = worksheet.write_string(row_idx, 7, row.return_date.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 8, &row.status);
        }

        let _ = worksheet.autofit();

    } else if is_controls {
        // Keldi-ketdi (controls)
        let data = ReportRepository::get_controls_by_date(p, start_date, end_date).await?;
        
        if data.is_empty() {
            return Err(AppError::NotFound("Tanlangan kunlar oralig'ida keldi-ketdi ma'lumotlari topilmadi".into()));
        }

        // Sarlavhalar
        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "To'liq ism", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "Rol", &header_format);
        let _ = worksheet.write_string_with_format(0, 3, "Lavozim / Guruh", &header_format);
        let _ = worksheet.write_string_with_format(0, 4, "Kelgan vaqti", &header_format);
        let _ = worksheet.write_string_with_format(0, 5, "Ketgan vaqti", &header_format);

        // Ma'lumotlar
        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;
            let role_str = row.role.as_deref().unwrap_or("-");
            let role_display = match role_str {
                "student" => "Talaba",
                "employee" => "Xodim",
                "teacher" => "O'qituvchi",
                "admin" => "Administrator",
                _ => role_str,
            };
            
            let pos_display = if role_str == "student" {
                format!("{} {}", 
                    row.department_name.as_deref().unwrap_or(""), 
                    row.group_name.as_deref().unwrap_or("")
                ).trim().to_string()
            } else {
                row.staff_position.clone().unwrap_or_else(|| "-".to_string())
            };
            let pos_display = if pos_display.is_empty() { "-".to_string() } else { pos_display };

            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, row.full_name.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 2, role_display);
            let _ = worksheet.write_string(row_idx, 3, &pos_display);
            let _ = worksheet.write_string(row_idx, 4, row.arrival.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 5, row.departure.as_deref().unwrap_or("-"));
        }

        let _ = worksheet.autofit();
    } else if is_submissions {
        // Taqdim etilgan kitoblar (submissions)
        let data = ReportRepository::get_submissions_by_teacher(p, params.teacher_id.as_deref()).await?;
        
        if data.is_empty() {
            return Err(AppError::NotFound("Ushbu o'qituvchi bo'yicha taqdim etilgan kitoblar topilmadi".into()));
        }

        // Sarlavhalar
        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "Taqdim etilgan sana", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "Kitob nomi", &header_format);
        let _ = worksheet.write_string_with_format(0, 3, "Mualliflar", &header_format);
        let _ = worksheet.write_string_with_format(0, 4, "Holati", &header_format);
        let _ = worksheet.write_string_with_format(0, 5, "Admin izohi", &header_format);

        // Ma'lumotlar
        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;

            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, &row.submitted_at);
            let _ = worksheet.write_string(row_idx, 2, &row.title);
            let _ = worksheet.write_string(row_idx, 3, &row.author);
            let _ = worksheet.write_string(row_idx, 4, &row.status);
            let _ = worksheet.write_string(row_idx, 5, row.admin_comment.as_deref().unwrap_or("-"));
        }

        let _ = worksheet.autofit();
    } else if is_users {
        let data = ReportRepository::get_users_statistics(
            p,
            params.status.as_deref(),
            params.department.as_deref(),
            params.group_name.as_deref(),
            params.role.as_deref(),
        ).await?;
        if data.is_empty() { return Err(AppError::NotFound("Filtrlarga mos foydalanuvchilar yo'q".into())); }
        
        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "F.I.SH", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "Fakultet / Bo'lim", &header_format);
        let _ = worksheet.write_string_with_format(0, 3, "Yo'nalish / Mutaxassislik", &header_format);
        let _ = worksheet.write_string_with_format(0, 4, "Guruh", &header_format);
        let _ = worksheet.write_string_with_format(0, 5, "Ta'lim shakli", &header_format);
        let _ = worksheet.write_string_with_format(0, 6, "Lavozim", &header_format);
        let _ = worksheet.write_string_with_format(0, 7, "Ro'yxatdan o'tgan sana", &header_format);

        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;
            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, &row.full_name);
            let _ = worksheet.write_string(row_idx, 2, row.department_name.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 3, row.specialty_name.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 4, row.group_name.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 5, row.education_form.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 6, row.staff_position.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 7, row.created_at.as_deref().unwrap_or("-"));
        }
        let _ = worksheet.autofit();

    } else if is_inventory {
        let data = ReportRepository::get_book_inventory(
            p,
            params.category.as_deref().map(String::from),
            params.language.as_deref().map(String::from),
            params.format.as_deref().map(String::from),
            params.teacher_id.as_deref().map(String::from)
        ).await?;
        if data.is_empty() { return Err(AppError::NotFound("Kitoblar tarmog'i bo'sh".into())); }
        
        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "Kitob nomi", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "Muallif", &header_format);
        let _ = worksheet.write_string_with_format(0, 3, "Soni", &header_format);
        let _ = worksheet.write_string_with_format(0, 4, "Ijarada", &header_format);
        let _ = worksheet.write_string_with_format(0, 5, "Javon", &header_format);

        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;
            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, &row.title);
            let _ = worksheet.write_string(row_idx, 2, &row.author);
            let _ = worksheet.write_number(row_idx, 3, row.total_quantity as f64);
            let _ = worksheet.write_number(row_idx, 4, row.rented_count as f64);
            let _ = worksheet.write_string(row_idx, 5, row.shelf_location.as_deref().unwrap_or("-"));
        }
        let _ = worksheet.autofit();

    } else if is_overdue {
        let data = ReportRepository::get_overdue_rentals(p, start_date, end_date).await?;
        if data.is_empty() { return Err(AppError::NotFound("Muddatidan o'tgan ijaralar topilmadi".into())); }
        
        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "O'quvchi/Xodim", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "ID", &header_format);
        let _ = worksheet.write_string_with_format(0, 3, "Rol", &header_format);
        let _ = worksheet.write_string_with_format(0, 4, "Guruh/Lavozim", &header_format);
        let _ = worksheet.write_string_with_format(0, 5, "Kitob", &header_format);
        let _ = worksheet.write_string_with_format(0, 6, "Berilgan sana", &header_format);
        let _ = worksheet.write_string_with_format(0, 7, "Qaytarish muddati", &header_format);
        let _ = worksheet.write_string_with_format(0, 8, "Kechikish (kun)", &header_format);

        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;
            let role_str = row.role.as_deref().unwrap_or("-");
            let role_display = match role_str {
                "student" => "Talaba", "employee" => "Xodim", "teacher" => "O'qituvchi", "staff" => "Kutubxonachi", "admin" => "Administrator", _ => role_str,
            };
            let pos_display = if role_str == "student" {
                format!("{} {}", row.department_name.as_deref().unwrap_or(""), row.group_name.as_deref().unwrap_or("")).trim().to_string()
            } else {
                row.staff_position.clone().unwrap_or_else(|| "-".to_string())
            };
            let pos_display = if pos_display.is_empty() { "-".to_string() } else { pos_display };

            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, row.user_full_name.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 2, &row.user_id_str);
            let _ = worksheet.write_string(row_idx, 3, role_display);
            let _ = worksheet.write_string(row_idx, 4, &pos_display);
            let _ = worksheet.write_string(row_idx, 5, row.book_title.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 6, &row.loan_date);
            let _ = worksheet.write_string(row_idx, 7, &row.due_date);
            let _ = worksheet.write_number(row_idx, 8, row.overdue_days as f64);
        }
        let _ = worksheet.autofit();

    } else if is_requests {
        let data = ReportRepository::get_book_requests_by_date(p, start_date, end_date).await?;
        if data.is_empty() { return Err(AppError::NotFound("Kitob so'rovlari topilmadi".into())); }
        
        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "So'rovchi", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "Kitob", &header_format);
        let _ = worksheet.write_string_with_format(0, 3, "Turi", &header_format);
        let _ = worksheet.write_string_with_format(0, 4, "Holati", &header_format);
        let _ = worksheet.write_string_with_format(0, 5, "Sana", &header_format);
        let _ = worksheet.write_string_with_format(0, 6, "Xodim izohi", &header_format);

        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;
            let type_str = if row.request_type == "physical" { "Kitob/qog'oz" } else { "Elektron/Audio" };
            let status_str = match row.status.as_str() {
                "pending" => "Kutilmoqda", "processing" => "Ko'rilmoqda", "ready" => "Tayyor/Qondirildi", "rejected" => "Rad etildi", _ => &row.status,
            };

            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, row.user_full_name.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 2, row.book_title.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 3, type_str);
            let _ = worksheet.write_string(row_idx, 4, status_str);
            let _ = worksheet.write_string(row_idx, 5, row.created_at.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 6, row.employee_comment.as_deref().unwrap_or("-"));
        }
        let _ = worksheet.autofit();

    } else if is_gate {
        // Keldi-ketdi mavjud yordamchi funksiya orqali
        let data = ReportRepository::get_controls_by_date(p, start_date, end_date).await?;
        if data.is_empty() { return Err(AppError::NotFound("Ushbu davrda kirib-chiqish ma'lumotlari mavjud emas".into())); }
        
        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "To'liq ism", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "Lavozim / Guruh", &header_format);
        let _ = worksheet.write_string_with_format(0, 3, "Kelgan vaqti", &header_format);
        let _ = worksheet.write_string_with_format(0, 4, "Ketgan vaqti", &header_format);

        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;
            let role_str = row.role.as_deref().unwrap_or("-");
            
            let pos_display = if role_str == "student" {
                format!("{} {}", row.department_name.as_deref().unwrap_or(""), row.group_name.as_deref().unwrap_or("")).trim().to_string()
            } else {
                row.staff_position.clone().unwrap_or_else(|| "-".to_string())
            };
            let pos_display = if pos_display.is_empty() { "-".to_string() } else { pos_display };

            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, row.full_name.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 2, &pos_display);
            let _ = worksheet.write_string(row_idx, 3, row.arrival.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 4, row.departure.as_deref().unwrap_or("-"));
        }
        let _ = worksheet.autofit();

    } else if params.report_type == "books_added" {
        // Xodimlar qo'shgan kitoblar hisoboti
        let data = ReportRepository::get_books_added_by_staff(p, params.staff_id.as_deref()).await?;
        if data.is_empty() { return Err(AppError::NotFound("Ushbu xodim tomonidan qo'shilgan kitoblar topilmadi".into())); }

        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "Kitob nomi", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "Muallif", &header_format);
        let _ = worksheet.write_string_with_format(0, 3, "Kategoriya", &header_format);
        let _ = worksheet.write_string_with_format(0, 4, "Til", &header_format);
        let _ = worksheet.write_string_with_format(0, 5, "Format", &header_format);
        let _ = worksheet.write_string_with_format(0, 6, "Nusxa", &header_format);
        let _ = worksheet.write_string_with_format(0, 7, "Xodim", &header_format);
        let _ = worksheet.write_string_with_format(0, 8, "Qo'shilgan vaqti", &header_format);

        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;
            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, &row.title);
            let _ = worksheet.write_string(row_idx, 2, &row.author);
            let _ = worksheet.write_string(row_idx, 3, row.category.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 4, row.language.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 5, row.format.as_deref().unwrap_or("-"));
            let _ = worksheet.write_number(row_idx, 6, row.total_quantity.unwrap_or(0) as f64);
            let _ = worksheet.write_string(row_idx, 7, row.added_by_name.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 8, &row.created_at);
        }
        let _ = worksheet.autofit();

    } else if params.report_type == "books_added" {
        let data = ReportRepository::get_books_added_by_staff(p, params.staff_id.as_deref()).await?;
        if data.is_empty() {
            return Err(AppError::NotFound("Ushbu xodim bo'yicha kitoblar topilmadi".into()));
        }

        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "Kitob nomi", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "Muallif", &header_format);
        let _ = worksheet.write_string_with_format(0, 3, "Kategoriya", &header_format);
        let _ = worksheet.write_string_with_format(0, 4, "Til", &header_format);
        let _ = worksheet.write_string_with_format(0, 5, "Format", &header_format);
        let _ = worksheet.write_string_with_format(0, 6, "Nusxa", &header_format);
        let _ = worksheet.write_string_with_format(0, 7, "Xodim", &header_format);
        let _ = worksheet.write_string_with_format(0, 8, "Qo'shilgan vaqti", &header_format);

        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;
            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, &row.title);
            let _ = worksheet.write_string(row_idx, 2, &row.author);
            let _ = worksheet.write_string(row_idx, 3, row.category.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 4, row.language.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 5, row.format.as_deref().unwrap_or("-"));
            let _ = worksheet.write_number(row_idx, 6, row.total_quantity.unwrap_or(0) as f64);
            let _ = worksheet.write_string(row_idx, 7, row.added_by_name.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 8, &row.created_at);
        }
        let _ = worksheet.autofit();

    } else if is_staff_book_counts {
        let data = ReportRepository::get_staff_book_counts(p).await?;
        if data.is_empty() {
            return Err(AppError::NotFound("Xodimlar statistikasi mavjud emas".into()));
        }

        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "Kutubxona xodimi (F.I.SH)", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "Qo'shgan kitoblari soni (Nusxa)", &header_format);

        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;
            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, &row.full_name);
            let _ = worksheet.write_number(row_idx, 2, row.count as f64);
        }
        let _ = worksheet.autofit();

    } else {
        return Err(AppError::BadRequest("Noto'g'ri hisobot turi".into()));
    }

    // Xotiraga saqlash va javob berish
    let buf = workbook.save_to_buffer().map_err(|e| {

        AppError::InternalError(format!("Excel fayl yaratishda xatolik: {}", e))
    })?;

    Ok(HttpResponse::Ok()
        .content_type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .append_header((
            "Content-Disposition",
            format!("attachment; filename=\"report_{}_{}_{}.xlsx\"", 
                if is_rentals { "rentals" } 
                else if is_controls { "controls" } 
                else if is_submissions { "submissions" }
                else if is_users { "users" }
                else if is_inventory { "inventory" }
                else if is_overdue { "overdue" }
                else if is_requests { "requests" }
                else if is_gate { "gate" }
                else if params.report_type == "books_added" { "books_added" }
                else if is_staff_book_counts { "staff_book_counts" }
                else { "other" },
                start_date.format("%Y%m%d"),
                end_date.format("%Y%m%d")
            ),
        ))
        .body(buf))
}

/// GET /api/reports/preview
/// Hisobot ma'lumotlarining bir qismini (masalan, dastlabki 15 tasini) JSON ko'rinishida qaytarish
pub async fn preview_report(
    pool: web::Data<PgPool>,
    claims: Claims,
    query: web::Query<ReportExportParams>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    let params = query.into_inner();
    let p = pool.get_ref();

    let start_date = chrono::NaiveDate::parse_from_str(
        &params.start_date.unwrap_or_else(|| "2020-01-01".to_string()), 
        "%Y-%m-%d"
    ).unwrap_or_else(|_| chrono::NaiveDate::from_ymd_opt(2020, 1, 1).unwrap());

    let end_date = chrono::NaiveDate::parse_from_str(
        &params.end_date.unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d").to_string()), 
        "%Y-%m-%d"
    ).unwrap_or_else(|_| chrono::Local::now().date_naive());

    let is_rentals = params.report_type == "rentals";
    let is_controls = params.report_type == "controls";
    let is_submissions = params.report_type == "submissions";
    let is_users = params.report_type == "users_statistics";
    let is_inventory = params.report_type == "book_inventory";
    let is_overdue = params.report_type == "overdue_rentals";
    let is_requests = params.report_type == "book_requests";
    let is_gate = params.report_type == "gate_control";
    let is_books_added = params.report_type == "books_added";
    let is_staff_book_counts = params.report_type == "staff_book_counts";

    let result_json = if is_rentals {
        let mut data = ReportRepository::get_rentals_by_date(p, start_date, end_date).await?;
        data.truncate(15);
        serde_json::to_value(data).unwrap()
    } else if is_controls || is_gate {
        let mut data = ReportRepository::get_controls_by_date(p, start_date, end_date).await?;
        data.truncate(15);
        serde_json::to_value(data).unwrap()
    } else if is_submissions {
        let mut data = ReportRepository::get_submissions_by_teacher(p, params.teacher_id.as_deref()).await?;
        data.truncate(15);
        serde_json::to_value(data).unwrap()
    } else if is_users {
        let mut data = ReportRepository::get_users_statistics(
            p,
            params.status.as_deref(),
            params.department.as_deref(),
            params.group_name.as_deref(),
            params.role.as_deref(),
        ).await?;
        data.truncate(15);
        serde_json::to_value(data).unwrap()
    } else if is_inventory {
        let mut data = ReportRepository::get_book_inventory(
            p,
            params.category.as_deref().map(String::from),
            params.language.as_deref().map(String::from),
            params.format.as_deref().map(String::from),
            params.teacher_id.as_deref().map(String::from)
        ).await?;
        data.truncate(15);
        serde_json::to_value(data).unwrap()
    } else if is_overdue {
        let mut data = ReportRepository::get_overdue_rentals(p, start_date, end_date).await?;
        data.truncate(15);
        serde_json::to_value(data).unwrap()
    } else if is_requests {
        let mut data = ReportRepository::get_book_requests_by_date(p, start_date, end_date).await?;
        data.truncate(15);
        serde_json::to_value(data).unwrap()
    } else if is_books_added {
        let mut data = ReportRepository::get_books_added_by_staff(p, params.staff_id.as_deref()).await?;
        data.truncate(15);
        serde_json::to_value(data).unwrap()
    } else if is_staff_book_counts {
        let mut data = ReportRepository::get_staff_book_counts(p).await?;
        data.truncate(15);
        serde_json::to_value(data).unwrap()
    } else {
        return Err(AppError::BadRequest("Noto'g'ri hisobot turi".into()));
    };

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": result_json
    })))
}

/// GET /api/reports/user-filter-options
/// Users jadvalidan fakultet/bo'lim va guruh qiymatlarini (distinct) qaytarish
pub async fn get_user_filter_options(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin"]) {
        return Ok(resp);
    }
    let p = pool.get_ref();

    // Distinct department_name (and specialty_name) combined
    let dept_rows = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT DISTINCT "department_name" FROM "users" 
           WHERE "department_name" IS NOT NULL AND "department_name" <> ''
           ORDER BY "department_name""#
    )
    .fetch_all(p)
    .await?;

    let spec_rows = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT DISTINCT "specialty_name" FROM "users" 
           WHERE "specialty_name" IS NOT NULL AND "specialty_name" <> ''
           ORDER BY "specialty_name""#
    )
    .fetch_all(p)
    .await?;

    let group_rows = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT DISTINCT "group_name" FROM "users" 
           WHERE "group_name" IS NOT NULL AND "group_name" <> ''
           ORDER BY "group_name""#
    )
    .fetch_all(p)
    .await?;

    let departments: Vec<String> = dept_rows.into_iter().flatten().collect();
    let specialties: Vec<String> = spec_rows.into_iter().flatten().collect();
    let groups: Vec<String> = group_rows.into_iter().flatten().collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": {
            "departments": departments,
            "specialties": specialties,
            "groups": groups
        }
    })))
}

/// GET /api/reports/book-filter-options
/// Kitoblar jadvalidan category, language, format va submited_by(o'qituvchilar) ro'yxatini qaytarish
pub async fn get_book_filter_options(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin"]) {
        return Ok(resp);
    }
    let p = pool.get_ref();

    let category_rows = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT DISTINCT "category" FROM "book" 
           WHERE "category" IS NOT NULL AND "category" <> ''
           ORDER BY "category""#
    )
    .fetch_all(p)
    .await?;

    let language_rows = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT DISTINCT "language" FROM "book" 
           WHERE "language" IS NOT NULL AND "language" <> ''
           ORDER BY "language""#
    )
    .fetch_all(p)
    .await?;

    let format_rows = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT DISTINCT "format" FROM "book" 
           WHERE "format" IS NOT NULL AND "format" <> ''
           ORDER BY "format""#
    )
    .fetch_all(p)
    .await?;

    // O'qituvchilar: book.submitted_by da ishtirok etgan user_id larni topamiz va users dan full_name ni olamiz
    #[derive(serde::Serialize, sqlx::FromRow)]
    struct TeacherOption {
        pub id: String,
        pub full_name: String,
    }

    let teachers = sqlx::query_as::<_, TeacherOption>(
        r#"SELECT DISTINCT u."id"::text, u."full_name"
           FROM "book" b
           JOIN "users" u ON b."submitted_by" = u."id"::text
           WHERE b."submitted_by" IS NOT NULL AND b."submitted_by" <> ''
           ORDER BY u."full_name""#
    )
    .fetch_all(p)
    .await?;

    let categories: Vec<String> = category_rows.into_iter().flatten().collect();
    let languages: Vec<String> = language_rows.into_iter().flatten().collect();
    let formats: Vec<String> = format_rows.into_iter().flatten().collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": {
            "categories": categories,
            "languages": languages,
            "formats": formats,
            "teachers": teachers
        }
    })))
}

/// GET /api/reports/staff-book-counts
/// Admin Xodimlar sahifasi uchun har bir xodim nechta kitob qo'shganligini olish
pub async fn get_staff_book_counts(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin"]) {
        return Ok(resp);
    }

    let p = pool.get_ref();
    let stats_data = ReportRepository::get_staff_book_counts(p).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": stats_data
    })))
}

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
        }
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
        let data = ReportRepository::get_submissions_by_date(p, start_date, end_date).await?;
        
        if data.is_empty() {
            return Err(AppError::NotFound("Tanlangan kunlar oralig'ida mualliflar taqdim etgan kitoblar topilmadi".into()));
        }

        // Sarlavhalar
        let _ = worksheet.write_string_with_format(0, 0, "Tr", &header_format);
        let _ = worksheet.write_string_with_format(0, 1, "Taqdim etilgan sana", &header_format);
        let _ = worksheet.write_string_with_format(0, 2, "Kitob nomi", &header_format);
        let _ = worksheet.write_string_with_format(0, 3, "Mualliflar", &header_format);
        let _ = worksheet.write_string_with_format(0, 4, "O'qituvchi FISH", &header_format);
        let _ = worksheet.write_string_with_format(0, 5, "Holati", &header_format);
        let _ = worksheet.write_string_with_format(0, 6, "Admin izohi", &header_format);

        // Ma'lumotlar
        for (i, row) in data.iter().enumerate() {
            let row_idx = (i + 1) as u32;

            let _ = worksheet.write_number(row_idx, 0, (i + 1) as f64);
            let _ = worksheet.write_string(row_idx, 1, &row.submitted_at);
            let _ = worksheet.write_string(row_idx, 2, &row.title);
            let _ = worksheet.write_string(row_idx, 3, &row.author);
            let _ = worksheet.write_string(row_idx, 4, row.teacher_full_name.as_deref().unwrap_or("-"));
            let _ = worksheet.write_string(row_idx, 5, &row.status);
            let _ = worksheet.write_string(row_idx, 6, row.admin_comment.as_deref().unwrap_or("-"));
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
                if is_rentals { "rentals" } else if is_controls { "controls" } else { "submissions" },
                start_date.format("%Y%m%d"),
                end_date.format("%Y%m%d")
            ),
        ))
        .body(buf))
}

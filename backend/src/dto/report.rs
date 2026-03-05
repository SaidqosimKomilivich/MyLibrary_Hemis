use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct ReportDashboardResponse {
    pub recent_rentals: Vec<crate::dto::rental::RentalResponse>,
    pub recent_controls: Vec<crate::dto::control::ControlResponse>,
}

#[derive(Debug, Serialize)]
pub struct SubmittedBookReportResponse {
    pub id: uuid::Uuid,
    pub title: String,
    pub author: String,
    pub status: String,
    pub admin_comment: Option<String>,
    pub submitted_at: String,
    pub teacher_full_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReportExportParams {
    pub report_type: String,        // "rentals" yki "controls" yoki "submissions"
    pub start_date: Option<String>, // yyyy-mm-dd
    pub end_date: Option<String>,   // yyyy-mm-dd
    // Foydalanuvchilar hisoboti uchun qo'shimcha filtrlar
    pub status: Option<String>,     // "active" | "inactive" | nil
    pub department: Option<String>, // department_name / specialty_name filtri
    pub group_name: Option<String>, // group_name filtri
    pub role: Option<String>,       // role filtri
    // Kitob fondi holati hisoboti uchun filtrlar
    pub category: Option<String>,   // category filtri
    pub language: Option<String>,   // language filtri
    pub format: Option<String>,     // format filtri
    pub teacher_id: Option<String>, // submitted_by filtri
    pub staff_id: Option<String>,   // books_added filtri (added_by)
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct BookAddedRow {
    pub title: String,
    pub author: String,
    pub language: Option<String>,
    pub category: Option<String>,
    pub format: Option<String>,
    pub total_quantity: Option<i32>,
    pub added_by_name: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct CategoryCount {
    pub category: String,
    pub count: i64,
    pub total_copies: i64,
}

#[derive(Debug, Serialize)]
pub struct LanguageCount {
    pub language: String,
    pub count: i64,
    pub total_copies: i64,
}

#[derive(Debug, Serialize)]
pub struct AdminDashboardResponse {
    pub total_users: i64,
    pub total_books: i64,
    pub active_rentals: i64,
    pub overdue_rentals: i64,
    pub pending_requests: i64,
    pub chart_data: Vec<DailyActivity>,
    pub recent_activities: Vec<ActivityLog>,
    pub books_by_category: Vec<CategoryCount>,
    pub books_by_language: Vec<LanguageCount>,
}

#[derive(Debug, Serialize)]
pub struct MyDashboardResponse {
    pub active_rentals: i64,
    pub overdue_rentals: i64,
    pub total_read: i64,
    pub pending_requests: i64,
    pub recent_activities: Vec<ActivityLog>,
}

#[derive(Debug, Serialize)]
pub struct DailyActivity {
    pub date: String,
    pub count: i64,
    pub controls_count: i64,
}

#[derive(Debug, Serialize)]
pub struct ActivityLog {
    pub id: String,
    pub user: String,
    pub action: String,
    pub time: String,
}

#[derive(Debug, Serialize)]
pub struct EmployeeDashboardResponse {
    pub today_rented: i64,
    pub today_returned: i64,
    pub pending_requests: i64,
    pub today_visitors: i64,
    pub pending_returns: Vec<PendingReturn>,
    pub popular_books: Vec<PopularBook>,
}

#[derive(Debug, Serialize)]
pub struct PendingReturn {
    pub student: String,
    pub book: String,
    pub due_date: String,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct PopularBook {
    pub title: String,
    pub author: String,
    pub count: i64,
    pub cover_image: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PublicDashboardResponse {
    pub total_books: i64,
    pub total_users: i64,
    pub total_rentals: i64,
    pub popular_books: Vec<PopularBook>,
}

// ──── Yangi hisobot turlari uchun DTO lar ────

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserStatRow {
    pub full_name: String,
    pub user_id: String,
    pub role: String,
    pub department_name: Option<String>,
    pub specialty_name: Option<String>,
    pub group_name: Option<String>,
    pub education_form: Option<String>,
    pub staff_position: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct BookInventoryRow {
    pub title: String,
    pub author: String,
    pub category: Option<String>,
    pub language: Option<String>,
    pub total_quantity: i32,
    pub available_quantity: i32,
    pub rented_count: i64,
    pub lost_count: i64,
    pub shelf_location: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct OverdueRentalRow {
    pub user_full_name: Option<String>,
    pub user_id_str: String,
    pub role: Option<String>,
    pub department_name: Option<String>,
    pub group_name: Option<String>,
    pub staff_position: Option<String>,
    pub book_title: Option<String>,
    pub loan_date: String,
    pub due_date: String,
    pub overdue_days: i32,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct BookRequestRow {
    pub user_full_name: Option<String>,
    pub user_role: Option<String>,
    pub book_title: Option<String>,
    pub request_type: String,
    pub status: String,
    pub employee_comment: Option<String>,
    pub created_at: Option<String>,
}

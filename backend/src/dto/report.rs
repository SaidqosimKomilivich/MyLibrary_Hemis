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

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct ReportDashboardResponse {
    pub recent_rentals: Vec<crate::dto::rental::RentalResponse>,
    pub recent_controls: Vec<crate::dto::control::ControlResponse>,
}

#[derive(Debug, Deserialize)]
pub struct ReportExportParams {
    pub report_type: String,        // "rentals" yki "controls"
    pub start_date: Option<String>, // yyyy-mm-dd
    pub end_date: Option<String>,   // yyyy-mm-dd
}

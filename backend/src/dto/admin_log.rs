use serde::{Deserialize, Serialize};

/// Tizim logi yozuvi
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemLogEntry {
    pub id: String,
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub target: String,
    pub module: String, // "auth", "http", "scheduler", "db", "system", "other"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub http_method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub http_route: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub http_status: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_ip: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_details: Option<String>,
    pub fields: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub span: Option<serde_json::Value>,
    pub raw_json: String,
}

/// Log statistikasi
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LogStats {
    pub total: usize,
    pub error_count: usize,
    pub warn_count: usize,
    pub info_count: usize,
    pub debug_count: usize,
}

/// Log fayli haqida ma'lumot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogFileInfo {
    pub filename: String,
    pub date: String,
    pub size_bytes: u64,
    pub is_current: bool,
}

/// Loglar API javobi
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemLogsResponse {
    pub files: Vec<LogFileInfo>,
    pub current_file: String,
    pub stats: LogStats,
    pub logs: Vec<SystemLogEntry>,
    pub total_filtered: usize,
    pub page: usize,
    pub per_page: usize,
    pub total_pages: usize,
}

/// Loglarni filtrlash va qidirish so'rovi parametrlari
#[derive(Debug, Deserialize)]
pub struct SystemLogQuery {
    pub file: Option<String>,
    pub level: Option<String>,
    pub module: Option<String>,
    pub status_code: Option<u16>,
    pub search: Option<String>,
    pub page: Option<usize>,
    pub per_page: Option<usize>,
}

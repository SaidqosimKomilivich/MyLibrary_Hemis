use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

use crate::dto::admin_log::{LogFileInfo, LogStats, SystemLogEntry, SystemLogQuery, SystemLogsResponse};
use crate::errors::AppError;

pub struct AdminLogService;

impl AdminLogService {
    const LOGS_DIR: &'static str = "logs";

    /// Mavjud log fayllari ro'yxatini olish (eng yangilari birinchi)
    pub fn list_log_files() -> Vec<LogFileInfo> {
        let logs_path = Path::new(Self::LOGS_DIR);
        if !logs_path.exists() || !logs_path.is_dir() {
            return Vec::new();
        }

        let mut files = Vec::new();

        if let Ok(entries) = std::fs::read_dir(logs_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
                    if filename.starts_with("backend.log") {
                        let metadata = entry.metadata().ok();
                        let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);

                        // backend.log.2026-09-18 yoki backend.log
                        let date = if filename == "backend.log" {
                            chrono::Utc::now().format("%Y-%m-%d").to_string()
                        } else if let Some(suffix) = filename.strip_prefix("backend.log.") {
                            suffix.to_string()
                        } else {
                            "Noma'lum".to_string()
                        };

                        files.push(LogFileInfo {
                            filename,
                            date,
                            size_bytes,
                            is_current: false,
                        });
                    }
                }
            }
        }

        // Eng yangi fayllarni birinchi qilish uchun saralaymiz
        files.sort_by(|a, b| b.filename.cmp(&a.filename));

        // Eng birinchi (eng oxirgi) faylni joriy deb belgilaymiz
        if let Some(first) = files.first_mut() {
            first.is_current = true;
        }

        files
    }

    /// Tizim loglarini o'qish, filtrlash va statistikani hisoblash
    pub fn get_logs(query: SystemLogQuery) -> Result<SystemLogsResponse, AppError> {
        let files = Self::list_log_files();

        // Qaysi faylni o'qishni aniqlaymiz
        let selected_file = if let Some(ref req_file) = query.file {
            // Path traversal hujumidan himoya
            if req_file.contains("..") || req_file.contains('/') || req_file.contains('\\') || !req_file.starts_with("backend.log") {
                return Err(AppError::BadRequest("Noto'g'ri log fayli nomi".to_string()));
            }
            req_file.clone()
        } else if let Some(first) = files.first() {
            first.filename.clone()
        } else {
            return Ok(SystemLogsResponse {
                files: Vec::new(),
                current_file: String::new(),
                stats: LogStats::default(),
                logs: Vec::new(),
                total_filtered: 0,
                page: 1,
                per_page: 50,
                total_pages: 1,
            });
        };

        let file_path = Path::new(Self::LOGS_DIR).join(&selected_file);
        if !file_path.exists() {
            return Ok(SystemLogsResponse {
                files,
                current_file: selected_file,
                stats: LogStats::default(),
                logs: Vec::new(),
                total_filtered: 0,
                page: 1,
                per_page: 50,
                total_pages: 1,
            });
        }

        let file = File::open(&file_path)
            .map_err(|e| AppError::InternalError(format!("Log faylini ochib bo'lmadi: {}", e)))?;
        let reader = BufReader::new(file);

        let mut stats = LogStats::default();
        let mut filtered_logs = Vec::new();

        let search_term = query.search.as_ref().map(|s| s.trim().to_lowercase()).filter(|s| !s.is_empty());
        let level_filter = query.level.as_ref().map(|s| s.trim().to_uppercase()).filter(|s| s != "ALL" && !s.is_empty());
        let module_filter = query.module.as_ref().map(|s| s.trim().to_lowercase()).filter(|s| s != "all" && !s.is_empty());

        let mut line_counter = 0usize;

        for line_res in reader.lines() {
            line_counter += 1;
            let line = match line_res {
                Ok(l) => l,
                Err(_) => continue,
            };

            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            stats.total += 1;

            // JSON parse
            let json_val: serde_json::Value = match serde_json::from_str(trimmed) {
                Ok(v) => v,
                Err(_) => {
                    // Agar JSON bo'lmasa xom matn sifatida qabul qilamiz
                    serde_json::json!({
                        "timestamp": "",
                        "level": "INFO",
                        "target": "raw",
                        "fields": { "message": trimmed }
                    })
                }
            };

            let timestamp = json_val.get("timestamp").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let level = json_val.get("level").and_then(|v| v.as_str()).unwrap_or("INFO").to_uppercase();
            let target = json_val.get("target").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let fields = json_val.get("fields").cloned().unwrap_or_else(|| serde_json::json!({}));
            let span = json_val.get("span").cloned();

            let message = fields
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            // Statistikani yangilash
            match level.as_str() {
                "ERROR" => stats.error_count += 1,
                "WARN" => stats.warn_count += 1,
                "INFO" => stats.info_count += 1,
                "DEBUG" | "TRACE" => stats.debug_count += 1,
                _ => {}
            }

            // HTTP ma'lumotlarini ajratib olish
            let (http_method, http_route, http_status, client_ip, request_id, error_details) = if let Some(ref s) = span {
                let method = s.get("http.method").and_then(|v| v.as_str()).map(String::from);
                let route = s.get("http.route").or_else(|| s.get("http.target")).and_then(|v| v.as_str()).map(String::from);
                let status = s.get("http.status_code").and_then(|v| v.as_u64()).map(|n| n as u16);
                let ip = s.get("http.client_ip").and_then(|v| v.as_str()).map(String::from);
                let req_id = s.get("request_id").and_then(|v| v.as_str()).map(String::from);
                let err_det = s.get("exception.details")
                    .or_else(|| s.get("exception.message"))
                    .and_then(|v| v.as_str())
                    .map(String::from);

                (method, route, status, ip, req_id, err_det)
            } else {
                (None, None, None, None, None, None)
            };

            let user_id = fields.get("user_id")
                .or_else(|| span.as_ref().and_then(|s| s.get("user_id")))
                .and_then(|v| v.as_str())
                .map(String::from);

            // Modul toifasini aniqlash
            let module = Self::categorize_module(&target, &message);

            // FILTRLARNI TEKSHIRISH

            // 1. Daraja filtri
            if let Some(ref req_lvl) = level_filter {
                if &level != req_lvl {
                    continue;
                }
            }

            // 2. Modul filtri
            if let Some(ref req_mod) = module_filter {
                if &module != req_mod {
                    continue;
                }
            }

            // 3. HTTP status kodi filtri (masalan 2xx, 4xx, 5xx yoki aniq 401)
            if let Some(req_status) = query.status_code {
                match http_status {
                    Some(actual_status) => {
                        if req_status < 10 {
                            // 2 => 200..300, 4 => 400..500, 5 => 500..600
                            let range_start = req_status * 100;
                            let range_end = range_start + 100;
                            if actual_status < range_start || actual_status >= range_end {
                                continue;
                            }
                        } else if actual_status != req_status {
                            continue;
                        }
                    }
                    None => continue,
                }
            }

            // 4. Matnli qidiruv
            if let Some(ref term) = search_term {
                let msg_match = message.to_lowercase().contains(term);
                let target_match = target.to_lowercase().contains(term);
                let user_match = user_id.as_ref().map(|u| u.to_lowercase().contains(term)).unwrap_or(false);
                let route_match = http_route.as_ref().map(|r| r.to_lowercase().contains(term)).unwrap_or(false);
                let ip_match = client_ip.as_ref().map(|ip| ip.contains(term)).unwrap_or(false);
                let req_match = request_id.as_ref().map(|r| r.to_lowercase().contains(term)).unwrap_or(false);
                let err_match = error_details.as_ref().map(|e| e.to_lowercase().contains(term)).unwrap_or(false);

                if !msg_match && !target_match && !user_match && !route_match && !ip_match && !req_match && !err_match {
                    continue;
                }
            }

            let entry = SystemLogEntry {
                id: format!("{}-{}", selected_file, line_counter),
                timestamp,
                level,
                message,
                target,
                module,
                http_method,
                http_route,
                http_status,
                client_ip,
                user_id,
                request_id,
                error_details,
                fields,
                span,
                raw_json: trimmed.to_string(),
            };

            filtered_logs.push(entry);
        }

        // Yangi loglarni tepaga chiqarish uchun teskari qilamiz (reverse chronological)
        filtered_logs.reverse();

        let total_filtered = filtered_logs.len();
        let per_page = query.per_page.unwrap_or(50).max(10).min(500);
        let page = query.page.unwrap_or(1).max(1);
        let total_pages = if total_filtered == 0 {
            1
        } else {
            (total_filtered + per_page - 1) / per_page
        };

        let start_idx = (page - 1) * per_page;
        let paged_logs = if start_idx >= total_filtered {
            Vec::new()
        } else {
            let end_idx = (start_idx + per_page).min(total_filtered);
            filtered_logs[start_idx..end_idx].to_vec()
        };

        Ok(SystemLogsResponse {
            files,
            current_file: selected_file,
            stats,
            logs: paged_logs,
            total_filtered,
            page,
            per_page,
            total_pages,
        })
    }

    /// Modul nomini aniqlash yordamchisi
    fn categorize_module(target: &str, message: &str) -> String {
        let t = target.to_lowercase();
        let m = message.to_lowercase();

        if t.contains("auth") || m.contains("login") || m.contains("kirish") || m.contains("parol") || m.contains("token") {
            "auth".to_string()
        } else if t.contains("middleware") || t.contains("actix_web") || t.contains("actix_server") || m.contains("http request") {
            "http".to_string()
        } else if t.contains("scheduler") || m.contains("scheduler") || m.contains("auto-checkout") || m.contains("reminder") {
            "scheduler".to_string()
        } else if t.contains("sqlx") || t.contains("postgres") || t.contains("db") || m.contains("migratsiya") {
            "db".to_string()
        } else if t.contains("seeder") || t.contains("main") || t.contains("config") || m.contains("server") {
            "system".to_string()
        } else {
            "other".to_string()
        }
    }

    /// Faylni xavfsiz yuklab olish uchun uning haqiqiy yo'lini tekshirish
    pub fn get_log_file_path(filename: &str) -> Result<PathBuf, AppError> {
        if filename.contains("..") || filename.contains('/') || filename.contains('\\') || !filename.starts_with("backend.log") {
            return Err(AppError::BadRequest("Noto'g'ri fayl nomi".to_string()));
        }

        let file_path = Path::new(Self::LOGS_DIR).join(filename);
        if !file_path.exists() || !file_path.is_file() {
            return Err(AppError::NotFound("Log fayli topilmadi".to_string()));
        }

        Ok(file_path)
    }
}

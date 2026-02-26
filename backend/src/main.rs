mod config;
mod db;
mod dto;
mod errors;
mod handlers;
mod middleware;
mod models;
mod repository;
mod seeder;
mod services;

use actix_web::{web, App, HttpResponse, HttpServer};
use tracing_actix_web::TracingLogger;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::config::Config;
use crate::handlers::auth_handler;
use crate::handlers::book_handler;
use crate::handlers::control_handler;
use crate::handlers::reading_handler;
use crate::handlers::rental_handler;
use crate::handlers::report_handler;
use crate::handlers::request_handler;
use crate::handlers::sync_handler;
use crate::handlers::upload_handler;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 1. Konfiguratsiyani yuklash
    let config = Config::from_env();

    // 2. Tracing (logging) ni sozlash
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    // Log faylga yozish uchun appender
    let file_appender = tracing_appender::rolling::daily("logs", "backend.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    tracing_subscriber::registry()
        .with(env_filter)
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(true)
                .with_thread_ids(true),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(non_blocking)
                .json(),
        )
        .init();

    tracing::info!("Server sozlamalari yuklandi");

    // 3. Ma'lumotlar bazasiga ulanish
    let pool = db::create_pool(&config.database_url).await;
    tracing::info!("Ma'lumotlar bazasiga ulandi");

    // 4. Server manzili
    let server_addr = format!("{}:{}", config.server_host, config.server_port);
    tracing::info!(address = %server_addr, "Server ishga tushmoqda");

    // Admin seeder - birinchi ishga tushirishda adminni yaratish
    if let Err(e) = seeder::seed_admin(&pool).await {
        tracing::error!("❌ Admin yaratishda xatolik: {}", e);
    }

    // 5. Uploads papkasini yaratish
    let upload_dir = config.upload_dir.clone();
    std::fs::create_dir_all(&upload_dir).expect("Uploads papkasini yaratib bo'lmadi");
    tracing::info!(upload_dir = %upload_dir, "Uploads papkasi tayyor");

    // 6. HTTP Serverni ishga tushirish
    let config_data = web::Data::new(config);
    let pool_data = web::Data::new(pool);

    HttpServer::new(move || {
        App::new()
            // Tracing middleware (har bir so'rovni loglash)
            .wrap(TracingLogger::default())
            // App data (barcha handler'larga shared state)
            .app_data(config_data.clone())
            .app_data(pool_data.clone())
            // Health check
            .route(
                "/health",
                web::get().to(|| async {
                    HttpResponse::Ok().json(serde_json::json!({
                        "status": "ok",
                        "message": "Server ishlayapti"
                    }))
                }),
            )
            // Auth routes
            .service(
                web::scope("/api/auth")
                    .route("/login", web::post().to(auth_handler::login))
                    .route("/logout", web::post().to(auth_handler::logout))
                    .route("/refresh", web::post().to(auth_handler::refresh))
                    .route("/me", web::get().to(auth_handler::me))
                    .route(
                        "/change-password",
                        web::post().to(auth_handler::change_password),
                    )
                    .route(
                        "/reset-password/{user_id}",
                        web::post().to(auth_handler::reset_password),
                    ),
            )
            // Book routes
            .service(
                web::scope("/api/books")
                    // ⚠️ Aniq yo'llar /{id} DAN OLDIN bo'lishi shart!
                    .route("", web::get().to(book_handler::get_books))
                    .route("", web::post().to(book_handler::create_book))
                    .route("/submit", web::post().to(book_handler::submit_book))
                    .route("/pending", web::get().to(book_handler::get_pending_books))
                    .route("/teacher-submissions", web::get().to(book_handler::get_teacher_submissions))
                    .route("/my-submissions", web::get().to(book_handler::get_my_submissions))
                    .route("/set-all-active", web::put().to(book_handler::set_all_active))
                    // /{id} routelari — eng oxirida
                    .route("/{id}", web::get().to(book_handler::get_book))
                    .route("/{id}", web::put().to(book_handler::update_book))
                    .route("/{id}", web::delete().to(book_handler::delete_book))
                    .route("/{id}/toggle-active", web::put().to(book_handler::toggle_book_active)),
            )
            // Control routes (foydalanuvchilar kelib-ketishini nazorat qilish)
            .service(
                web::scope("/api/control")
                    .route("/arrive", web::post().to(control_handler::arrive))
                    .route("/depart", web::post().to(control_handler::depart))
                    .route("/history", web::get().to(control_handler::get_history))
                    .route("/today", web::get().to(control_handler::get_today)),
            )
            // Rental routes (kitob topshirish va qaytarish)
            .service(
                web::scope("/api/rentals")
                    .route("/my", web::get().to(rental_handler::get_my_rentals))
                    .route("", web::post().to(rental_handler::create_rental))
                    .route("", web::get().to(rental_handler::get_rentals))
                    .route("/{id}", web::get().to(rental_handler::get_rental))
                    .route("/{id}/return", web::put().to(rental_handler::return_rental)),
            )
            // Upload routes
            .route("/api/upload", web::post().to(upload_handler::upload_file))
            .route("/api/upload", web::delete().to(upload_handler::delete_file))
            // Reading routes
            .service(
                web::scope("/api/readings")
                    .route("", web::post().to(reading_handler::start_reading))
                    .route("", web::get().to(reading_handler::get_readings))
                    .route("/{id}", web::delete().to(reading_handler::remove_reading)),
            )
            // Request routes
            .service(
                web::scope("/api/requests")
                    .route("", web::post().to(request_handler::create_request))
                    .route("", web::get().to(request_handler::get_all_requests))
                    .route("/my", web::get().to(request_handler::get_my_requests))
                    .route("/{id}/status", web::put().to(request_handler::update_request_status)),
            )
            // Report routes
            .service(
                web::scope("/api/reports")
                    .route("/dashboard", web::get().to(report_handler::get_dashboard))
                    .route("/admin-dashboard", web::get().to(report_handler::get_admin_dashboard))
                    .route("/my-dashboard", web::get().to(report_handler::get_my_dashboard))
                    .route("/export", web::get().to(report_handler::export_excel)),
            )
            // Sync routes (HEMIS sinxronlash)
            .service(
                web::scope("/api/sync")
                    // Talabalar
                    .route("/students", web::post().to(sync_handler::sync_students))
                    .route("/students", web::get().to(sync_handler::get_students))
                    // O'qituvchilar
                    .route("/teachers", web::post().to(sync_handler::sync_teachers))
                    .route("/teachers", web::get().to(sync_handler::get_teachers))
                    // Kutubxonachilar
                    .route("/staff", web::get().to(sync_handler::get_staff))
                    // Xodimlar
                    .route("/employees", web::post().to(sync_handler::sync_employees))
                    .route("/employees", web::get().to(sync_handler::get_employees))
                    // Adminlar
                    .route("/admins", web::get().to(sync_handler::get_admins)),
            )
            // Users routes
            .service(
                web::scope("/api/users")
                    .route("/{id}", web::get().to(sync_handler::get_user_by_id))
                    .route("/{id}/role", web::put().to(sync_handler::update_user_role))
                    .route("/{id}/status", web::put().to(sync_handler::update_user_status)),
            )
            // Static files (uploads papkasini brauzerdan ko'rish uchun explicit streaming NamedFile route)
            .route("/uploads/{subdir}/{filename}", web::get().to(upload_handler::serve_file))
    })
    .bind(&server_addr)?
    .run()
    .await
}

use chrono::NaiveDate;
use sqlx::{Arguments, PgPool};

use crate::dto::control::ControlResponse;
use crate::dto::rental::RentalResponse;
use crate::errors::AppError;

pub struct ReportRepository;

#[derive(Debug, sqlx::FromRow)]
pub struct ControlWithDetails {
    pub id: uuid::Uuid,
    pub user_id: String,
    pub arrival: Option<chrono::NaiveDateTime>,
    pub departure: Option<chrono::NaiveDateTime>,
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub department_name: Option<String>,
    pub group_name: Option<String>,
    pub staff_position: Option<String>,
}

impl ReportRepository {
    /// Oxirgi N ta ijara ma'lumotlarini olish usuli
    pub async fn get_recent_rentals(
        pool: &PgPool,
        limit: i64,
    ) -> Result<Vec<RentalResponse>, AppError> {
        let records = sqlx::query_as!(
            crate::repository::rental_repository::RentalWithDetails,
            r#"SELECT
                r."id", r."user_id", r."book_id",
                r."loan_date", r."due_date", r."return_date",
                r."status" as "status: crate::models::rental::RentalStatus", r."notes",
                b."title" as "book_title?",
                b."author" as "book_author?",
                b."cover_image_url" as "book_cover?",
                u."full_name" as "user_full_name?",
                u."role" as "role?",
                u."email" as "email?",
                u."phone" as "phone?",
                u."department_name" as "department_name?",
                u."group_name" as "group_name?",
                u."staff_position" as "staff_position?"
            FROM "book_rentals" r
            LEFT JOIN "book" b ON b."id"::text = r."book_id"
            LEFT JOIN "users" u ON u."user_id" = r."user_id"
            ORDER BY r."loan_date" DESC
            LIMIT $1"#,
            limit
        )
        .fetch_all(pool)
        .await?;

        Ok(records.into_iter().map(|r| r.into_response()).collect())
    }

    /// Oxirgi N ta keldi-ketdi ma'lumotlarini olish usuli
    pub async fn get_recent_controls(
        pool: &PgPool,
        limit: i64,
    ) -> Result<Vec<ControlResponse>, AppError> {
        let records = sqlx::query_as!(
            ControlWithDetails,
            r#"SELECT 
                c."id", c."user_id", c."arrival", c."departure",
                u."full_name" as "full_name?",
                u."role" as "role?",
                u."department_name" as "department_name?",
                u."group_name" as "group_name?",
                u."staff_position" as "staff_position?"
            FROM "control" c
            LEFT JOIN "users" u ON u."user_id" = c."user_id"
            ORDER BY c."arrival" DESC
            LIMIT $1"#,
            limit
        )
        .fetch_all(pool)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| ControlResponse {
                id: r.id,
                user_id: r.user_id,
                arrival: r.arrival.map(|t| t.to_string()),
                departure: r.departure.map(|t| t.to_string()),
                full_name: r.full_name,
                role: r.role,
                department_name: r.department_name,
                group_name: r.group_name,
                staff_position: r.staff_position,
            })
            .collect())
    }

    /// Belgilangan sanalar oralig'idagi ijaralarni olish Excel uchun
    pub async fn get_rentals_by_date(
        pool: &PgPool,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<RentalResponse>, AppError> {
        let records = sqlx::query_as!(
            crate::repository::rental_repository::RentalWithDetails,
            r#"SELECT
                r."id", r."user_id", r."book_id",
                r."loan_date", r."due_date", r."return_date",
                r."status" as "status: crate::models::rental::RentalStatus", r."notes",
                b."title" as "book_title?",
                b."author" as "book_author?",
                b."cover_image_url" as "book_cover?",
                u."full_name" as "user_full_name?",
                u."role" as "role?",
                u."email" as "email?",
                u."phone" as "phone?",
                u."department_name" as "department_name?",
                u."group_name" as "group_name?",
                u."staff_position" as "staff_position?"
            FROM "book_rentals" r
            LEFT JOIN "book" b ON b."id"::text = r."book_id"
            LEFT JOIN "users" u ON u."user_id" = r."user_id"
            WHERE r."loan_date" >= $1 AND r."loan_date" <= $2
            ORDER BY r."loan_date" DESC"#,
            start_date,
            end_date
        )
        .fetch_all(pool)
        .await?;

        Ok(records.into_iter().map(|r| r.into_response()).collect())
    }

    /// Belgilangan o'qituvchilar taqdim qilgan kitoblarni olish
    pub async fn get_submissions_by_teacher(
        pool: &PgPool,
        teacher_id: Option<&str>,
    ) -> Result<Vec<crate::dto::report::SubmittedBookReportResponse>, AppError> {
        #[derive(sqlx::FromRow)]
        struct SubmissionRow {
            id: uuid::Uuid,
            title: String,
            author: String,
            is_active: Option<bool>,
            admin_comment: Option<String>,
            created_at: chrono::DateTime<chrono::Utc>,
            teacher_name: Option<String>,
        }

        let mut query = sqlx::QueryBuilder::new(
            r#"SELECT 
                b."id", 
                b."title", 
                b."author", 
                b."is_active", 
                b."admin_comment", 
                b."created_at",
                u."full_name" as "teacher_name"
            FROM "book" b
            LEFT JOIN "users" u ON u."id"::text = b."submitted_by"
            WHERE b."submitted_by" IS NOT NULL"#,
        );

        if let Some(t_id) = teacher_id {
            if !t_id.is_empty() {
                query.push(" AND b.\"submitted_by\" = ");
                query.push_bind(t_id.to_string());
            }
        }

        query.push(" ORDER BY b.\"created_at\" DESC");

        let records: Vec<SubmissionRow> = query.build_query_as().fetch_all(pool).await?;

        Ok(records
            .into_iter()
            .map(|r| crate::dto::report::SubmittedBookReportResponse {
                id: r.id,
                title: r.title,
                author: r.author,
                status: if r.is_active.unwrap_or(false) {
                    "Faol".to_string()
                } else {
                    "Kutilmoqda".to_string()
                },
                admin_comment: r.admin_comment,
                submitted_at: r.created_at.format("%Y-%m-%d %H:%M:%S").to_string(),
                teacher_full_name: r.teacher_name,
            })
            .collect())
    }

    /// Xodimlar qo'shgan kitoblar — staff_id bo'yicha filtrland
    pub async fn get_books_added_by_staff(
        pool: &PgPool,
        staff_id: Option<&str>,
    ) -> Result<Vec<crate::dto::report::BookAddedRow>, AppError> {
        #[derive(sqlx::FromRow)]
        struct BookAddedRowInner {
            title: String,
            author: String,
            language: Option<String>,
            category: Option<String>,
            format: Option<String>,
            total_quantity: Option<i32>,
            added_by_name: Option<String>,
            created_at: chrono::DateTime<chrono::Utc>,
        }

        let mut query = sqlx::QueryBuilder::new(
            r#"SELECT
                b."title",
                b."author",
                b."language",
                b."category",
                b."format",
                b."total_quantity",
                u."full_name" as "added_by_name",
                b."created_at"
            FROM "book" b
            LEFT JOIN "users" u ON u."id" = b."added_by"
            WHERE b."added_by" IS NOT NULL"#,
        );

        if let Some(sid) = staff_id {
            if !sid.is_empty() {
                if let Ok(staff_uuid) = uuid::Uuid::parse_str(sid) {
                    query.push(" AND b.\"added_by\" = ");
                    query.push_bind(staff_uuid);
                }
            }
        }

        query.push(" ORDER BY b.\"created_at\" DESC");

        let records: Vec<BookAddedRowInner> = query.build_query_as().fetch_all(pool).await?;

        Ok(records
            .into_iter()
            .map(|r| crate::dto::report::BookAddedRow {
                title: r.title,
                author: r.author,
                language: r.language,
                category: r.category,
                format: r.format,
                total_quantity: r.total_quantity,
                added_by_name: r.added_by_name,
                created_at: r.created_at.format("%Y-%m-%d %H:%M").to_string(),
            })
            .collect())
    }

    /// Admin Xodimlar sahifasi uchun har bir xodim nechta kitob qo'shganligi
    pub async fn get_staff_book_counts(
        pool: &PgPool,
    ) -> Result<Vec<crate::dto::report::StaffBookCount>, AppError> {
        let query = sqlx::query_as!(
            crate::dto::report::StaffBookCount,
            r#"
            SELECT 
                u."id" as "staff_id", 
                u."full_name", 
                COUNT(b."id") as "count!"
            FROM "book" b
            JOIN "users" u ON b."added_by" = u."id"
            WHERE u."role" = 'staff'
            GROUP BY u."id", u."full_name"
            ORDER BY "count!" DESC, u."full_name" ASC
            "#
        );

        let results = query.fetch_all(pool).await?;
        Ok(results)
    }

    /// Belgilangan sanalar oralig'idagi keldi-ketdilarni olish Excel uchun
    pub async fn get_controls_by_date(
        pool: &PgPool,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<ControlResponse>, AppError> {
        let records = sqlx::query_as!(
            ControlWithDetails,
            r#"SELECT 
                c."id", c."user_id", c."arrival", c."departure",
                u."full_name" as "full_name?",
                u."role" as "role?",
                u."department_name" as "department_name?",
                u."group_name" as "group_name?",
                u."staff_position" as "staff_position?"
            FROM "control" c
            LEFT JOIN "users" u ON u."user_id" = c."user_id"
            WHERE DATE(c."arrival") >= $1 AND DATE(c."arrival") <= $2
            ORDER BY c."arrival" DESC"#,
            start_date,
            end_date
        )
        .fetch_all(pool)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| ControlResponse {
                id: r.id,
                user_id: r.user_id,
                arrival: r.arrival.map(|t| t.to_string()),
                departure: r.departure.map(|t| t.to_string()),
                full_name: r.full_name,
                role: r.role,
                department_name: r.department_name,
                group_name: r.group_name,
                staff_position: r.staff_position,
            })
            .collect())
    }

    /// Admin Dashboard KPI lari ma'lum bir yil va oy uchun
    pub async fn get_dashboard_kpis(
        pool: &PgPool,
        year: i32,
        month: u32,
    ) -> Result<(i64, i64, i64, i64, i64), AppError> {
        let start_date = chrono::NaiveDate::from_ymd_opt(year, month, 1)
            .ok_or_else(|| AppError::BadRequest("Noto'g'ri sana".into()))?
            .and_hms_opt(0, 0, 0)
            .unwrap();

        let mut next_month = month + 1;
        let mut next_year = year;
        if next_month > 12 {
            next_month = 1;
            next_year += 1;
        }
        let end_date = chrono::NaiveDate::from_ymd_opt(next_year, next_month, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();

        // Jami foydalanuvchilar (filtrlanmaydi oygacha)
        let total_users: i64 = sqlx::query_scalar!(r#"SELECT COUNT(*) FROM "users""#)
            .fetch_one(pool)
            .await?
            .unwrap_or(0);

        // Jami aktiv kitoblar (filtrlanmaydi)
        let total_books: i64 =
            sqlx::query_scalar!(r#"SELECT COUNT(*) FROM "book" WHERE "is_active" = true"#)
                .fetch_one(pool)
                .await?
                .unwrap_or(0);

        // O'sha oydagi aktiv ijaralar (shu oy ichida berilgan jami ijaralar)
        let active_rentals: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM "book_rentals" 
               WHERE ("loan_date" >= $1::date AND "loan_date" < $2::date)"#,
            start_date.date(),
            end_date.date()
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        // O'sha oydagi qarzdorliklar (Muddatidan o'tgan qarzlar global miqdori)
        let overdue_rentals: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM "book_rentals" WHERE "status" = 'overdue' OR ("status" = 'active' AND "due_date" < CURRENT_DATE)"#
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        // O'sha oydagi kutilyotgan so'rovlar (faqat kitob taqdim etilganlar emas, umumiy so'rovlar)
        // Yoki kitob arizalari (agar shunaqa bo'lsa)
        let pending_requests: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM "book" 
               WHERE ("created_at" >= $1 AND "created_at" < $2) AND "submitted_by" IS NOT NULL AND "is_active" = false"#,
            start_date.and_utc(), end_date.and_utc()
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        Ok((
            total_users,
            total_books,
            active_rentals,
            overdue_rentals,
            pending_requests,
        ))
    }

    /// Admin Dashboard uchun Category va Language bo'yicha kitob statistikasini olish
    pub async fn get_dashboard_book_stats(
        pool: &PgPool,
    ) -> Result<
        (
            Vec<crate::dto::report::CategoryCount>,
            Vec<crate::dto::report::LanguageCount>,
        ),
        AppError,
    > {
        let categories = sqlx::query!(
            r#"SELECT COALESCE(category, 'Boshqa') as "category!",
                      COUNT(*) as "count!",
                      COALESCE(SUM(COALESCE(total_quantity, 0)), 0) as "total_copies!"
               FROM "book"
               WHERE "is_active" = true
               GROUP BY category
               ORDER BY "count!" DESC"#
        )
        .fetch_all(pool)
        .await?;

        let languages = sqlx::query!(
            r#"SELECT COALESCE(language, 'Boshqa') as "language!",
                      COUNT(*) as "count!",
                      COALESCE(SUM(COALESCE(total_quantity, 0)), 0) as "total_copies!"
               FROM "book"
               WHERE "is_active" = true
               GROUP BY language
               ORDER BY "count!" DESC"#
        )
        .fetch_all(pool)
        .await?;

        let cat_stats = categories
            .into_iter()
            .map(|r| crate::dto::report::CategoryCount {
                category: r.category,
                count: r.count,
                total_copies: r.total_copies,
            })
            .collect();

        let lang_stats = languages
            .into_iter()
            .map(|r| crate::dto::report::LanguageCount {
                language: r.language,
                count: r.count,
                total_copies: r.total_copies,
            })
            .collect();

        Ok((cat_stats, lang_stats))
    }

    /// Admin Dashboard Chart ma'lumotlari (kunlik ijaralar soni) belgilangan oy uchun
    pub async fn get_dashboard_chart(
        pool: &PgPool,
        year: i32,
        month: u32,
    ) -> Result<Vec<crate::dto::report::DailyActivity>, AppError> {
        let start_date = chrono::NaiveDate::from_ymd_opt(year, month, 1)
            .ok_or_else(|| AppError::BadRequest("Noto'g'ri sana".into()))?;

        let mut next_month = month + 1;
        let mut next_year = year;
        if next_month > 12 {
            next_month = 1;
            next_year += 1;
        }

        let end_date = chrono::NaiveDate::from_ymd_opt(next_year, next_month, 1).unwrap();

        // 1 oylik taqvim yasaymiz va har bir kun uchun ijaralar va tashriflarni sanaymiz.
        let records = sqlx::query!(
            r#"
            WITH calendar AS (
                SELECT generate_series($1::date, $2::date - interval '1 day', '1 day')::date AS d
            )
            SELECT 
                calendar.d::text as "date_str",
                (SELECT COUNT(*) FROM "book_rentals" r WHERE r."loan_date" = calendar.d) as "rentals_count!",
                (SELECT COUNT(*) FROM "control" c WHERE c."arrival"::date = calendar.d) as "controls_count!"
            FROM calendar
            WHERE EXTRACT(ISODOW FROM calendar.d) != 7
            ORDER BY calendar.d ASC
            "#,
            start_date,
            end_date
        )
        .fetch_all(pool)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| crate::dto::report::DailyActivity {
                date: r.date_str.unwrap_or_default(),
                count: r.rentals_count,
                controls_count: r.controls_count,
            })
            .collect())
    }

    /// Admin Dashboard Oxirgi Faoliyatlar belgilangan oy uchun
    pub async fn get_dashboard_activities(
        pool: &PgPool,
        _year: i32,
        _month: u32,
        limit: i64,
    ) -> Result<Vec<crate::dto::report::ActivityLog>, AppError> {
        let records = sqlx::query!(
            r#"
            SELECT 
                "id" as "id!", "user_name" as "user_name!", "book_title", "action_type" as "action_type!", "action_date" as "action_date!"
            FROM (
                SELECT 
                    r."id"::text as "id",
                    u."full_name" as "user_name",
                    b."title" as "book_title",
                    'rented' as "action_type",
                    r."loan_date"::timestamp as "action_date"
                FROM "book_rentals" r
                JOIN "users" u ON u."user_id" = r."user_id"
                JOIN "book" b ON b."id"::text = r."book_id"
                WHERE r."loan_date" = CURRENT_DATE

                UNION ALL

                SELECT 
                    r."id"::text as "id",
                    u."full_name" as "user_name",
                    b."title" as "book_title",
                    'returned' as "action_type",
                    r."return_date"::timestamp as "action_date"
                FROM "book_rentals" r
                JOIN "users" u ON u."user_id" = r."user_id"
                JOIN "book" b ON b."id"::text = r."book_id"
                WHERE r."return_date" = CURRENT_DATE

                UNION ALL

                SELECT 
                    c."id"::text as "id",
                    u."full_name" as "user_name",
                    NULL as "book_title",
                    'visited' as "action_type",
                    c."arrival" as "action_date"
                FROM "control" c
                JOIN "users" u ON u."user_id" = c."user_id"
                WHERE c."arrival"::date = CURRENT_DATE
            ) AS combined_activities
            ORDER BY "action_date" DESC
            LIMIT $1
            "#,
            limit
        )
        .fetch_all(pool)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| {
                let action_text = match r.action_type.as_str() {
                    "rented" => format!(
                        "\"{}\" kitobini ijaraga oldi",
                        r.book_title.unwrap_or_default()
                    ),
                    "returned" => {
                        format!("\"{}\" kitobini qaytardi", r.book_title.unwrap_or_default())
                    }
                    "visited" => "Kutubxonaga tashrif buyurdi".to_string(),
                    _ => "Noma'lum harakat".to_string(),
                };

                let time_str = r.action_date.format("%Y-%m-%d").to_string();

                crate::dto::report::ActivityLog {
                    id: r.id,
                    user: r.user_name,
                    action: action_text,
                    time: time_str,
                }
            })
            .collect())
    }

    /// Personal Dashboard KPIs (hozirgi ijaralar, muddatidan o'tganlar, jami tarix, kutilayotgan so'rovlar)
    pub async fn get_my_dashboard_kpis(
        pool: &PgPool,
        user_id_str: &str,
        user_uuid: uuid::Uuid,
    ) -> Result<(i64, i64, i64, i64), AppError> {
        let active_rentals: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM "book_rentals" 
               WHERE "user_id" = $1 AND "status" = 'active'"#,
            user_id_str
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        let overdue_rentals: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM "book_rentals" 
               WHERE "user_id" = $1 AND ("status" = 'overdue' OR ("status" = 'active' AND "due_date" < CURRENT_DATE))"#,
            user_id_str
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        let total_read: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM "book_rentals" 
               WHERE "user_id" = $1 AND "status" = 'returned'"#,
            user_id_str
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        let pending_requests: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM "book_requests" 
               WHERE "user_id" = $1 AND "status" = 'pending'"#,
            user_uuid
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        Ok((
            active_rentals,
            overdue_rentals,
            total_read,
            pending_requests,
        ))
    }

    /// Personal Dashboard Oxirgi Faoliyatlar (Timeline)
    pub async fn get_my_activities(
        pool: &PgPool,
        user_id_str: &str,
        limit: i64,
    ) -> Result<Vec<crate::dto::report::ActivityLog>, AppError> {
        let records = sqlx::query!(
            r#"
            SELECT 
                "id" as "id!", "book_title", "action_type" as "action_type!", "action_date" as "action_date!"
            FROM (
                SELECT 
                    r."id"::text as "id",
                    b."title" as "book_title",
                    'rented' as "action_type",
                    r."loan_date"::timestamp as "action_date"
                FROM "book_rentals" r
                JOIN "book" b ON b."id"::text = r."book_id"
                WHERE r."user_id" = $1

                UNION ALL

                SELECT 
                    r."id"::text as "id",
                    b."title" as "book_title",
                    'returned' as "action_type",
                    r."return_date"::timestamp as "action_date"
                FROM "book_rentals" r
                JOIN "book" b ON b."id"::text = r."book_id"
                WHERE r."return_date" IS NOT NULL AND r."user_id" = $1

                UNION ALL

                SELECT 
                    c."id"::text as "id",
                    NULL as "book_title",
                    'visited' as "action_type",
                    c."arrival" as "action_date"
                FROM "control" c
                WHERE c."arrival" IS NOT NULL AND c."user_id" = $2
            ) AS combined_activities
            ORDER BY "action_date" DESC
            LIMIT $3
            "#,
            user_id_str, // rentals book_rentals user_id
            user_id_str, // control user_id
            limit
        )
        .fetch_all(pool)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| {
                let action_text = match r.action_type.as_str() {
                    "rented" => format!(
                        "\"{}\" kitobini ijaraga oldingiz",
                        r.book_title.unwrap_or_default()
                    ),
                    "returned" => format!(
                        "\"{}\" kitobini qaytardingiz",
                        r.book_title.unwrap_or_default()
                    ),
                    "visited" => "Kutubxonaga tashrif buyurdingiz".to_string(),
                    _ => "Noma'lum harakat".to_string(),
                };

                let time_str = r.action_date.format("%Y-%m-%d %H:%M").to_string();

                crate::dto::report::ActivityLog {
                    id: r.id,
                    user: "Siz".to_string(),
                    action: action_text,
                    time: time_str,
                }
            })
            .collect())
    }

    /// Employee Dashboard KPIs
    pub async fn get_employee_dashboard(
        pool: &PgPool,
    ) -> Result<crate::dto::report::EmployeeDashboardResponse, AppError> {
        let today = chrono::Local::now().date_naive();

        // 1. Bugun berilgan jami kitoblar
        let today_rented: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM "book_rentals" WHERE "loan_date" = $1"#,
            today
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        // 2. Bugun qaytarilgan kitoblar
        let today_returned: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM "book_rentals" WHERE "return_date" = $1"#,
            today
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        // 3. Kutilayotgan so'rovlar (Hali qabul qilinmagan pending kitob/ijara arizalari)
        let pending_requests: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM "book_requests" WHERE "status" = 'pending'"#
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        // 4. Bugungi talabalar (Keldi-ketdi tizimiga bugun kirgan insonlar)
        let today_visitors: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(DISTINCT "user_id") FROM "control" WHERE DATE("arrival") = $1"#,
            today
        )
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

        // 5. Qaytarish kutilayotganlar (Active bo'lib qolgan 5 ta kitobni qaytarish vaqti bo'yicha eng yaqin)
        let pending_returns_records = sqlx::query!(
            r#"
            SELECT 
                u."full_name" as "student_name",
                b."title" as "book_title",
                r."due_date",
                r."status"::text as "status!"
            FROM "book_rentals" r
            JOIN "users" u ON u."user_id" = r."user_id"
            JOIN "book" b ON b."id"::text = r."book_id"
            WHERE r."status" IN ('active', 'overdue')
            ORDER BY r."due_date" ASC
            LIMIT 5
            "#
        )
        .fetch_all(pool)
        .await?;

        let pending_returns = pending_returns_records
            .into_iter()
            .map(|rec| crate::dto::report::PendingReturn {
                student: rec.student_name,
                book: rec.book_title,
                due_date: rec.due_date.format("%Y-%m-%d").to_string(),
                status: if rec.status == "overdue" || (rec.status == "active" && rec.due_date < chrono::Local::now().naive_local().date()) {
                    "overdue".to_string()
                } else {
                    "normal".to_string()
                },
            })
            .collect();

        // 6. Mashhur kitoblar (Eng ko'p ijaraga olingan 4 ta kitob)
        let popular_books_records = sqlx::query!(
            r#"
            SELECT 
                b."title",
                b."author",
                b."cover_image_url" as cover_image,
                COUNT(r."id") as "rent_count"
            FROM "book_rentals" r
            JOIN "book" b ON b."id"::text = r."book_id"
            GROUP BY b."id", b."title", b."author", b."cover_image_url"
            ORDER BY "rent_count" DESC
            LIMIT 4
            "#
        )
        .fetch_all(pool)
        .await?;

        let popular_books = popular_books_records
            .into_iter()
            .map(|rec| crate::dto::report::PopularBook {
                title: rec.title,
                author: rec.author,
                count: rec.rent_count.unwrap_or(0),
                cover_image: rec.cover_image,
            })
            .collect();

        Ok(crate::dto::report::EmployeeDashboardResponse {
            today_rented,
            today_returned,
            pending_requests,
            today_visitors,
            pending_returns,
            popular_books,
        })
    }

    /// Public Dashboard Stats (Landing Page)
    pub async fn get_public_stats(
        pool: &PgPool,
    ) -> Result<crate::dto::report::PublicDashboardResponse, AppError> {
        // 1. Jami kitoblar soni (Barcha tillar, barcha nusxalar)
        let total_books: i64 = sqlx::query_scalar!(r#"SELECT COUNT(*)::bigint FROM "book""#)
            .fetch_one(pool)
            .await?
            .unwrap_or(0);

        // 2. Jami foydalanuvchilar (O'quvchilar va O'qituvchilar/Xodimlar)
        let total_users: i64 = sqlx::query_scalar!(r#"SELECT COUNT(*)::bigint FROM "users""#)
            .fetch_one(pool)
            .await?
            .unwrap_or(0);

        // 3. Jami qilingan ijaralar (O'qib bo'lingan yoki faol kutubxona jarayonlari)
        let total_rentals: i64 =
            sqlx::query_scalar!(r#"SELECT COUNT(*)::bigint FROM "book_rentals""#)
                .fetch_one(pool)
                .await?
                .unwrap_or(0);

        // 4. Eng mashhur 8 ta kitob
        let popular_books_records = sqlx::query!(
            r#"
            SELECT 
                b."title",
                b."author",
                b."cover_image_url" as cover_image,
                COUNT(r."id") as "rent_count"
            FROM "book_rentals" r
            JOIN "book" b ON b."id"::text = r."book_id"
            GROUP BY b."id", b."title", b."author", b."cover_image_url"
            ORDER BY "rent_count" DESC
            LIMIT 8
            "#
        )
        .fetch_all(pool)
        .await?;

        let popular_books = popular_books_records
            .into_iter()
            .map(|rec| crate::dto::report::PopularBook {
                title: rec.title,
                author: rec.author,
                count: rec.rent_count.unwrap_or(0),
                cover_image: rec.cover_image,
            })
            .collect();

        Ok(crate::dto::report::PublicDashboardResponse {
            total_books,
            total_users,
            total_rentals,
            popular_books,
        })
    }

    // ──── Yangi hisobot eksport funksiyalari ────

    /// Foydalanuvchilar statistikasi (filtrlar bo'yicha)
    pub async fn get_users_statistics(
        pool: &PgPool,
        status: Option<&str>,
        department: Option<&str>,
        group_name: Option<&str>,
        role: Option<&str>,
    ) -> Result<Vec<crate::dto::report::UserStatRow>, AppError> {
        let mut conditions: Vec<String> = Vec::new();
        let mut param_idx = 1usize;

        // Status filtri
        if let Some(s) = status {
            if s == "active" {
                conditions.push(format!("\"active\" = TRUE"));
            } else if s == "inactive" {
                conditions.push(format!("\"active\" = FALSE"));
            }
        }

        // Department / Faculty / Kafedra filtri
        let dept_sql = if department.is_some() && !department.unwrap_or("").is_empty() {
            let cond = format!(
                "(LOWER(\"department_name\") LIKE LOWER(${}::text) OR LOWER(\"specialty_name\") LIKE LOWER(${}::text))",
                param_idx, param_idx + 1
            );
            param_idx += 2;
            conditions.push(cond);
            true
        } else {
            false
        };

        // Group filtri
        let group_sql = if group_name.is_some() && !group_name.unwrap_or("").is_empty() {
            let cond = format!("LOWER(\"group_name\") LIKE LOWER(${}::text)", param_idx);
            param_idx += 1;
            conditions.push(cond);
            true
        } else {
            false
        };

        // Role filtri (yoki umuman adminlarni chiqarib tashlash qoidasi)
        if role.is_some() && !role.unwrap_or("").is_empty() {
            let cond = format!("\"role\" = ${}::text", param_idx);
            // param_idx += 1;
            conditions.push(cond);
        } else {
            // Default: 'admin' rolini chiqarmaymiz
            let cond = format!("\"role\" != 'admin'");
            conditions.push(cond);
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let sql = format!(
            r#"SELECT 
                "full_name",
                "department_name",
                "specialty_name",
                "group_name",
                "education_form",
                "staff_position",
                TO_CHAR("created_at", 'YYYY-MM-DD HH24:MI') as "created_at"
            FROM "users"
            {}
            ORDER BY "role", "department_name", "full_name""#,
            where_clause
        );

        // Build query dinamik bind qilish orqali
        let dept_like = department.map(|d| format!("%{}%", d));
        let group_like = group_name.map(|g| format!("%{}%", g));

        let rows = sqlx::query_as::<_, crate::dto::report::UserStatRow>(&sql);

        let role_sql = role.is_some() && !role.unwrap_or("").is_empty();

        // Bind department x2, group x1, role x1 — tartibda
        let rows = if dept_sql {
            let d = dept_like.as_deref().unwrap_or("");
            let rows = rows.bind(d).bind(d);
            let rows = if group_sql {
                let g = group_like.as_deref().unwrap_or("");
                let rows = rows.bind(g);
                if role_sql {
                    rows.bind(role.unwrap_or("")).fetch_all(pool).await?
                } else {
                    rows.fetch_all(pool).await?
                }
            } else if role_sql {
                rows.bind(role.unwrap_or("")).fetch_all(pool).await?
            } else {
                rows.fetch_all(pool).await?
            };
            rows
        } else if group_sql {
            let g = group_like.as_deref().unwrap_or("");
            let rows = rows.bind(g);
            if role_sql {
                rows.bind(role.unwrap_or("")).fetch_all(pool).await?
            } else {
                rows.fetch_all(pool).await?
            }
        } else if role_sql {
            rows.bind(role.unwrap_or("")).fetch_all(pool).await?
        } else {
            rows.fetch_all(pool).await?
        };

        Ok(rows)
    }

    /// Kitob fondi holati (umumiy, mavjud, ijaradagi, yo'qotilgan)
    pub async fn get_book_inventory(
        pool: &PgPool,
        category: Option<String>,
        language: Option<String>,
        format: Option<String>,
        teacher_id: Option<String>,
    ) -> Result<Vec<crate::dto::report::BookInventoryRow>, AppError> {
        let mut query_str = String::from(
            r#"SELECT 
                b."title",
                b."author",
                b."category",
                b."language",
                COALESCE(b."total_quantity", 0) as "total_quantity",
                COALESCE(b."available_quantity", 0) as "available_quantity",
                COALESCE(rented.cnt, 0)::bigint as "rented_count",
                COALESCE(lost.cnt, 0)::bigint as "lost_count",
                b."shelf_location"
            FROM "book" b
            LEFT JOIN (
                SELECT "book_id", COUNT(*) as cnt 
                FROM "book_rentals" 
                WHERE "status" IN ('active', 'overdue')
                GROUP BY "book_id"
            ) rented ON rented."book_id" = b."id"::text
            LEFT JOIN (
                SELECT "book_id", COUNT(*) as cnt 
                FROM "book_rentals" 
                WHERE "status" = 'lost'
                GROUP BY "book_id"
            ) lost ON lost."book_id" = b."id"::text
            WHERE b."is_active" = true "#,
        );

        let mut args = sqlx::postgres::PgArguments::default();
        let mut arg_idx = 1;

        if let Some(c) = category {
            if !c.is_empty() {
                query_str.push_str(&format!(" AND b.\"category\" = ${}", arg_idx));
                args.add(c).map_err(|e| AppError::InternalError(e.to_string()))?;
                arg_idx += 1;
            }
        }

        if let Some(l) = language {
            if !l.is_empty() {
                query_str.push_str(&format!(" AND b.\"language\" = ${}", arg_idx));
                args.add(l).map_err(|e| AppError::InternalError(e.to_string()))?;
                arg_idx += 1;
            }
        }

        if let Some(f) = format {
            if !f.is_empty() {
                query_str.push_str(&format!(" AND b.\"format\" = ${}", arg_idx));
                args.add(f).map_err(|e| AppError::InternalError(e.to_string()))?;
                arg_idx += 1;
            }
        }

        if let Some(t) = teacher_id {
            if !t.is_empty() {
                query_str.push_str(&format!(" AND b.\"submitted_by\" = ${}", arg_idx));
                args.add(t).map_err(|e| AppError::InternalError(e.to_string()))?;
                // arg_idx += 1; // Last arg
            }
        }

        query_str.push_str(" ORDER BY b.\"title\"");

        let rows =
            sqlx::query_as_with::<_, crate::dto::report::BookInventoryRow, _>(&query_str, args)
                .fetch_all(pool)
                .await?;

        Ok(rows)
    }

    /// Muddati o'tgan ijaralar (qarzdorlar ro'yxati)
    pub async fn get_overdue_rentals(
        pool: &PgPool,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<crate::dto::report::OverdueRentalRow>, AppError> {
        let rows = sqlx::query_as::<_, crate::dto::report::OverdueRentalRow>(
            r#"SELECT 
                u."full_name" as "user_full_name",
                r."user_id" as "user_id_str",
                u."role",
                u."department_name",
                u."group_name",
                u."staff_position",
                b."title" as "book_title",
                r."loan_date"::text as "loan_date",
                r."due_date"::text as "due_date",
                (CURRENT_DATE - r."due_date")::integer as "overdue_days"
            FROM "book_rentals" r
            LEFT JOIN "users" u ON u."user_id" = r."user_id"
            LEFT JOIN "book" b ON b."id"::text = r."book_id"
            WHERE r."status" IN ('active', 'overdue')
              AND r."due_date" < CURRENT_DATE
              AND r."loan_date" >= $1 AND r."loan_date" <= $2
            ORDER BY "overdue_days" DESC"#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(pool)
        .await?;

        Ok(rows)
    }

    /// Kitob so'rovlari (sana oralig'ida)
    pub async fn get_book_requests_by_date(
        pool: &PgPool,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<crate::dto::report::BookRequestRow>, AppError> {
        let rows = sqlx::query_as::<_, crate::dto::report::BookRequestRow>(
            r#"SELECT 
                u."full_name" as "user_full_name",
                u."role" as "user_role",
                b."title" as "book_title",
                br."request_type",
                br."status",
                br."employee_comment",
                TO_CHAR(br."created_at", 'YYYY-MM-DD HH24:MI') as "created_at"
            FROM "book_requests" br
            LEFT JOIN "users" u ON u."id" = br."user_id"
            LEFT JOIN "book" b ON b."id" = br."book_id"
            WHERE DATE(br."created_at") >= $1 AND DATE(br."created_at") <= $2
            ORDER BY br."created_at" DESC"#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(pool)
        .await?;

        Ok(rows)
    }
}

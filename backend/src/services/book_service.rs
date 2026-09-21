use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::book::*;
use crate::errors::AppError;
use crate::repository::book_repository::BookRepository;

const PER_PAGE: i64 = 20;

pub struct BookService;

impl BookService {
    /// Kitoblar ro'yxati (paginatsiya bilan, 20 tadan)
    /// is_staff = true bo'lsa: is_active = false kitoblar ham ko'rinadi
    pub async fn get_books(
        pool: &PgPool,
        params: PaginationParams,
        is_staff: bool,
    ) -> Result<PaginatedBooksResponse, AppError> {
        let page = params.page.unwrap_or(1).max(1);
        let search = params.search.as_deref();
        let category = params.category.as_deref();
        let genre = params.genre.as_deref();
        let target_audience = params.target_audience.as_deref();
        let format = params.format.as_deref();
        let language = params.language.as_deref();

        let total_items = BookRepository::count(
            pool,
            search,
            category,
            genre,
            target_audience,
            format,
            language,
            is_staff,
        ).await?;
        let total_pages = ((total_items as f64 / PER_PAGE as f64).ceil() as i64).max(1);

        let books = BookRepository::find_all(
            pool,
            page,
            PER_PAGE,
            search,
            category,
            genre,
            target_audience,
            format,
            language,
            is_staff,
        ).await?;

        let data: Vec<BookResponse> = books.into_iter().map(BookResponse::from).collect();

        Ok(PaginatedBooksResponse {
            success: true,
            data,
            pagination: PaginationInfo {
                current_page: page,
                per_page: PER_PAGE,
                total_items,
                total_pages,
            },
        })
    }

    /// Bitta kitob ma'lumotlari
    pub async fn get_book_by_id(pool: &PgPool, id: Uuid) -> Result<BookResponse, AppError> {
        let book = BookRepository::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Kitob topilmadi".to_string()))?;

        Ok(BookResponse::from(book))
    }

    /// Yangi kitob yaratish (admin/staff uchun, is_active = true)
    pub async fn create_book(
        pool: &PgPool,
        mut req: CreateBookRequest,
        added_by: Uuid,
    ) -> Result<BookResponse, AppError> {
        if req.author.trim().is_empty() {
            req.author = "Noma'lum muallif".to_string();
        }
        let book = BookRepository::create(pool, &req, added_by).await?;
        tracing::info!(book_id = %book.id, title = %book.title, "Yangi kitob yaratildi");
        Ok(BookResponse::from(book))
    }

    /// O'qituvchi o'z kitobini taqdim etadi (is_active = false)
    pub async fn submit_book(
        pool: &PgPool,
        mut req: CreateBookRequest,
        submitted_by: &str,
    ) -> Result<BookResponse, AppError> {
        if req.author.trim().is_empty() {
            req.author = "Noma'lum muallif".to_string();
        }
        let book = BookRepository::create_submitted(pool, &req, submitted_by).await?;
        tracing::info!(book_id = %book.id, teacher = %submitted_by, "O'qituvchi kitob taqdim etdi");
        Ok(BookResponse::from(book))
    }

    /// Kutilayotgan kitoblar (is_active = false) — admin/staff uchun
    pub async fn get_pending_books(pool: &PgPool) -> Result<Vec<BookResponse>, AppError> {
        let books = BookRepository::find_pending(pool).await?;
        Ok(books.into_iter().map(BookResponse::from).collect())
    }

    /// O'qituvchi o'zi yuborgan kitoblar (submitted_by = user_id)
    pub async fn get_my_submissions(pool: &PgPool, user_id: &str) -> Result<Vec<BookResponse>, AppError> {
        let books = BookRepository::find_by_submitted_by(pool, user_id).await?;
        Ok(books.into_iter().map(BookResponse::from).collect())
    }

    /// O'qituvchilar tomonidan taqdim etilgan barcha kitoblarni olish
    pub async fn get_all_submitted_books(pool: &PgPool) -> Result<Vec<BookResponse>, AppError> {
        let books = BookRepository::find_all_submitted(pool).await?;
        Ok(books.into_iter().map(BookResponse::from).collect())
    }

    /// is_active ni almashtirish — admin/staff uchun
    pub async fn toggle_active(pool: &PgPool, id: Uuid, comment: Option<String>) -> Result<BookResponse, AppError> {
        let book = BookRepository::toggle_active(pool, id, comment)
            .await?
            .ok_or_else(|| AppError::NotFound("Kitob topilmadi".to_string()))?;
        Ok(BookResponse::from(book))
    }

    /// Kitobni tahrirlash (faqat admin)
    pub async fn update_book(
        pool: &PgPool,
        id: Uuid,
        mut req: UpdateBookRequest,
    ) -> Result<BookResponse, AppError> {
        // 1. Kitob mavjudligini tekshirish
        let current_book = BookRepository::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Kitob topilmadi".to_string()))?;

        // 2. Ayni paytda ijarada turgan nusxalar sonini hisoblash
        let active_rentals: (i64,) = sqlx::query_as(
            r#"SELECT COUNT(*) FROM "book_rentals" WHERE "book_id" = $1 AND "status" IN ('active', 'overdue')"#
        )
        .bind(id.to_string())
        .fetch_one(pool)
        .await?;
        let active_rentals_count = active_rentals.0 as i32;

        let old_total = current_book.total_quantity.unwrap_or(1);
        let old_available = current_book.available_quantity.unwrap_or(old_total);

        // 3. Umumiy soni (total_quantity) validatsiyasi va hisobi
        if let Some(new_total) = req.total_quantity {
            if new_total < 1 {
                return Err(AppError::BadRequest("Kitobning umumiy soni kamida 1 ta bo'lishi kerak".to_string()));
            }

            // Yangi umumiy soni ayni paytda ijarada turgan kitoblar sonidan kam bo'lishi mumkin emas
            if new_total < active_rentals_count {
                return Err(AppError::BadRequest(format!(
                    "Kitobning umumiy sonini {} tadan kam qilib bo'lmaydi, chunki ayni paytda {} ta kitob foydalanuvchilar tomonidan ijaraga olingan",
                    active_rentals_count, active_rentals_count
                )));
            }

            // Agar available_quantity alohida ko'rsatilmagan bo'lsa:
            // Yangi qo'shilgan farqni (delta) avtomatik ombordagi mavjud soniga qo'shamiz
            if req.available_quantity.is_none() {
                let delta = new_total - old_total;
                let new_available = (old_available + delta).max(0).min(new_total - active_rentals_count);
                req.available_quantity = Some(new_available);
            }
        }

        // 4. Mavjud soni (available_quantity) validatsiyasi
        if let Some(new_available) = req.available_quantity {
            let target_total = req.total_quantity.unwrap_or(old_total);
            let max_allowed_available = target_total - active_rentals_count;

            if new_available < 0 {
                return Err(AppError::BadRequest("Mavjud kitoblar soni 0 dan kam bo'lishi mumkin emas".to_string()));
            }
            if new_available > max_allowed_available {
                return Err(AppError::BadRequest(format!(
                    "Mavjud kitoblar soni {} tadan oshmasligi kerak (jami: {} ta, ayni paytda ijarada: {} ta)",
                    max_allowed_available, target_total, active_rentals_count
                )));
            }
        }

        // 5. Yangilash
        let book = BookRepository::update(pool, id, &req)
            .await?
            .ok_or_else(|| AppError::NotFound("Kitob topilmadi".to_string()))?;

        tracing::info!(book_id = %book.id, "Kitob yangilandi");
        Ok(BookResponse::from(book))
    }

    /// Kitobni o'chirish (faqat admin, soft delete)
    pub async fn delete_book(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        let deleted = BookRepository::soft_delete(pool, id).await?;
        if !deleted {
            return Err(AppError::NotFound("Kitob topilmadi".to_string()));
        }
        tracing::info!(book_id = %id, "Kitob o'chirildi");
        Ok(())
    }

    /// Barcha kitoblarni faollashtirish yoki nofaollashtirish (admin uchun)
    pub async fn set_all_active(pool: &PgPool, active: bool) -> Result<u64, AppError> {
        let count = BookRepository::set_all_active(pool, active).await?;
        tracing::info!(count = count, active = active, "Barcha kitoblar holati o'zgartirildi");
        Ok(count)
    }

    /// Dublikat kitobni tekshirish
    pub async fn check_duplicate(
        pool: &PgPool,
        params: CheckDuplicateQuery,
    ) -> Result<CheckDuplicateResponse, AppError> {
        let (book, match_type) = BookRepository::check_duplicate(
            pool,
            params.title.as_deref(),
            params.author.as_deref(),
            params.isbn.as_deref(),
        )
        .await?;

        if let Some(b) = book {
            Ok(CheckDuplicateResponse {
                exists: true,
                match_type: match_type.map(|s| s.to_string()),
                book: Some(BookResponse::from(b)),
            })
        } else {
            Ok(CheckDuplicateResponse {
                exists: false,
                match_type: None,
                book: None,
            })
        }
    }

    /// Kitoblarni ommaviy import qilish (Excel orqali)
    /// - Dublikatlar bazaga qayta qo'shilmaydi va skipped_books ga olinadi.
    /// - Muqovasi yo'q kitoblarga standart '/icon_arm.png' belgilanadi.
    pub async fn import_books(
        pool: &PgPool,
        req: ImportBooksRequest,
        added_by: Uuid,
    ) -> Result<ImportBooksResponse, AppError> {
        let mut imported_count = 0;
        let mut skipped_count = 0;
        let mut skipped_books = Vec::new();
        let mut seen_keys = std::collections::HashSet::new();

        let mut tx = pool.begin().await?;

        for mut book_item in req.books {
            let title = book_item.title.trim().to_string();
            let author = if book_item.author.trim().is_empty() {
                "Noma'lum muallif".to_string()
            } else {
                book_item.author.trim().to_string()
            };

            if title.is_empty() {
                skipped_count += 1;
                skipped_books.push(SkippedBookInfo {
                    title: "Nomsiz qator".to_string(),
                    author: author.clone(),
                    reason: "Kitob nomi kiritilmagan".to_string(),
                });
                continue;
            }

            // A. Fayl ichidagi dublikatlarni aniqlash
            let norm_key = format!(
                "{}:{}",
                title.to_lowercase().split_whitespace().collect::<Vec<_>>().join(" "),
                author.to_lowercase().split_whitespace().collect::<Vec<_>>().join(" ")
            );
            if !seen_keys.insert(norm_key) {
                skipped_count += 1;
                skipped_books.push(SkippedBookInfo {
                    title: title.clone(),
                    author: author.clone(),
                    reason: "Faylning o'zida takroriy kiritilgan".to_string(),
                });
                continue;
            }

            // B. Bazadagi mavjud dublikatni tekshirish
            let isbn_clean = book_item.isbn_13.as_deref().or(book_item.isbn_10.as_deref());
            let (dup, match_type) = BookRepository::check_duplicate(
                pool,
                Some(&title),
                Some(&author),
                isbn_clean,
            )
            .await?;

            if let Some(_) = dup {
                let reason = match match_type {
                    Some("isbn") => "Bazada ushbu ISBN bilan kitob allaqachon mavjud".to_string(),
                    _ => "Bazada ushbu nom va muallif bilan kitob allaqachon mavjud".to_string(),
                };
                skipped_count += 1;
                skipped_books.push(SkippedBookInfo {
                    title,
                    author,
                    reason,
                });
                continue;
            }

            // C. Muqova rasmi bo'lmasa -> '/icon_arm.png'
            let cover_url = match book_item.cover_image_url {
                Some(ref c) if !c.trim().is_empty() => book_item.cover_image_url,
                _ => Some("/icon_arm.png".to_string()),
            };
            book_item.cover_image_url = cover_url;

            // D. Miqdorlarni hisoblash
            let total = book_item.total_quantity.unwrap_or(1).max(1);
            let available = book_item.available_quantity.unwrap_or(total).min(total);

            // E. Bazaga kiritish
            sqlx::query(
                r#"
                INSERT INTO "book" (
                    "title", "author", "subtitle", "translator",
                    "isbn_13", "isbn_10", "publisher", "publication_date",
                    "edition", "language", "category", "genre", "target_audience",
                    "description", "page_count", "duration_seconds", "format",
                    "cover_image_url", "digital_file_url", "shelf_location",
                    "total_quantity", "available_quantity", "is_active", "added_by"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, true, $23
                )
                "#,
            )
            .bind(&title)
            .bind(&author)
            .bind(&book_item.subtitle)
            .bind(&book_item.translator)
            .bind(&book_item.isbn_13)
            .bind(&book_item.isbn_10)
            .bind(&book_item.publisher)
            .bind(book_item.publication_date)
            .bind(&book_item.edition)
            .bind(&book_item.language)
            .bind(&book_item.category)
            .bind(&book_item.genre)
            .bind(&book_item.target_audience)
            .bind(&book_item.description)
            .bind(book_item.page_count)
            .bind(book_item.duration_seconds)
            .bind(book_item.format.as_deref().unwrap_or("bosma"))
            .bind(&book_item.cover_image_url)
            .bind(&book_item.digital_file_url)
            .bind(&book_item.shelf_location)
            .bind(total)
            .bind(available)
            .bind(added_by)
            .execute(&mut *tx)
            .await?;

            imported_count += 1;
        }

        tx.commit().await?;

        let message = if skipped_count > 0 {
            format!(
                "Import yakunlandi: {} ta kitob qo'shildi, {} ta kitob allaqachon mavjud bo'lgani sababli o'tkazib yuborildi",
                imported_count, skipped_count
            )
        } else {
            format!("Muvaffaqiyatli: barcha {} ta kitob bazaga saqlandi", imported_count)
        };

        tracing::info!(imported = imported_count, skipped = skipped_count, "Kitoblar importi yakunlandi");

        Ok(ImportBooksResponse {
            success: true,
            message,
            imported_count,
            skipped_count,
            skipped_books,
        })
    }
}


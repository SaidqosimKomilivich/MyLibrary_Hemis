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

        let total_items = BookRepository::count(pool, search, category, is_staff).await?;
        let total_pages = ((total_items as f64 / PER_PAGE as f64).ceil() as i64).max(1);

        let books = BookRepository::find_all(pool, page, PER_PAGE, search, category, is_staff).await?;

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
        req: CreateBookRequest,
        added_by: Uuid,
    ) -> Result<BookResponse, AppError> {
        let book = BookRepository::create(pool, &req, added_by).await?;
        tracing::info!(book_id = %book.id, title = %book.title, "Yangi kitob yaratildi");
        Ok(BookResponse::from(book))
    }

    /// O'qituvchi o'z kitobini taqdim etadi (is_active = false)
    pub async fn submit_book(
        pool: &PgPool,
        req: CreateBookRequest,
        submitted_by: &str,
    ) -> Result<BookResponse, AppError> {
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
        req: UpdateBookRequest,
    ) -> Result<BookResponse, AppError> {
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
}

use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::book::*;
use crate::errors::AppError;
use crate::repository::book_repository::BookRepository;

const PER_PAGE: i64 = 20;

pub struct BookService;

impl BookService {
    /// Kitoblar ro'yxati (paginatsiya bilan, 20 tadan)
    pub async fn get_books(
        pool: &PgPool,
        params: PaginationParams,
    ) -> Result<PaginatedBooksResponse, AppError> {
        let page = params.page.unwrap_or(1).max(1);
        let search = params.search.as_deref();
        let category = params.category.as_deref();

        let total_items = BookRepository::count(pool, search, category).await?;
        let total_pages = (total_items as f64 / PER_PAGE as f64).ceil() as i64;

        let books = BookRepository::find_all(pool, page, PER_PAGE, search, category).await?;

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

    /// Yangi kitob yaratish (faqat admin)
    pub async fn create_book(
        pool: &PgPool,
        req: CreateBookRequest,
    ) -> Result<BookResponse, AppError> {
        let book = BookRepository::create(pool, &req).await?;
        tracing::info!(book_id = %book.id, title = %book.title, "Yangi kitob yaratildi");
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
}

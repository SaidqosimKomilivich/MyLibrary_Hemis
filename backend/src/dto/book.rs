use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Kitob yaratish uchun DTO
#[derive(Debug, Deserialize)]
pub struct CreateBookRequest {
    pub title: String,
    pub author: String,
    pub subtitle: Option<String>,
    pub translator: Option<String>,
    pub isbn_13: Option<String>,
    pub isbn_10: Option<String>,
    pub publisher: Option<String>,
    pub publication_date: Option<i32>,
    pub edition: Option<String>,
    pub language: Option<String>,
    pub category: Option<String>,
    pub genre: Option<String>,
    pub description: Option<String>,
    pub page_count: Option<i32>,
    pub duration_seconds: Option<i32>,
    pub format: Option<String>,
    pub cover_image_url: Option<String>,
    pub digital_file_url: Option<String>,
    pub shelf_location: Option<String>,
    pub total_quantity: Option<i32>,
    pub available_quantity: Option<i32>,
}

/// Kitobni tahrirlash uchun DTO (barcha maydonlar ixtiyoriy)
#[derive(Debug, Deserialize)]
pub struct UpdateBookRequest {
    pub title: Option<String>,
    pub author: Option<String>,
    pub subtitle: Option<String>,
    pub translator: Option<String>,
    pub isbn_13: Option<String>,
    pub isbn_10: Option<String>,
    pub publisher: Option<String>,
    pub publication_date: Option<i32>,
    pub edition: Option<String>,
    pub language: Option<String>,
    pub category: Option<String>,
    pub genre: Option<String>,
    pub description: Option<String>,
    pub page_count: Option<i32>,
    pub duration_seconds: Option<i32>,
    pub format: Option<String>,
    pub cover_image_url: Option<String>,
    pub digital_file_url: Option<String>,
    pub shelf_location: Option<String>,
    pub total_quantity: Option<i32>,
    pub available_quantity: Option<i32>,
}

/// Paginatsiya uchun query parametrlari
#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
}

/// Paginatsiyali javob
#[derive(Debug, Serialize)]
pub struct PaginatedBooksResponse {
    pub success: bool,
    pub data: Vec<BookResponse>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, Serialize)]
pub struct PaginationInfo {
    pub current_page: i64,
    pub per_page: i64,
    pub total_items: i64,
    pub total_pages: i64,
}

/// Kitob javobi
#[derive(Debug, Serialize)]
pub struct BookResponse {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub subtitle: Option<String>,
    pub translator: Option<String>,
    pub isbn_13: Option<String>,
    pub isbn_10: Option<String>,
    pub publisher: Option<String>,
    pub publication_date: Option<i32>,
    pub edition: Option<String>,
    pub language: Option<String>,
    pub category: Option<String>,
    pub genre: Option<String>,
    pub description: Option<String>,
    pub page_count: Option<i32>,
    pub duration_seconds: Option<i32>,
    pub format: Option<String>,
    pub cover_image_url: Option<String>,
    pub digital_file_url: Option<String>,
    pub shelf_location: Option<String>,
    pub total_quantity: Option<i32>,
    pub available_quantity: Option<i32>,
    pub rating: Option<f64>,
    pub is_active: Option<bool>,
}

impl From<crate::models::book::Book> for BookResponse {
    fn from(book: crate::models::book::Book) -> Self {
        BookResponse {
            id: book.id,
            title: book.title,
            author: book.author,
            subtitle: book.subtitle,
            translator: book.translator,
            isbn_13: book.isbn_13,
            isbn_10: book.isbn_10,
            publisher: book.publisher,
            publication_date: book.publication_date,
            edition: book.edition,
            language: book.language,
            category: book.category,
            genre: book.genre,
            description: book.description,
            page_count: book.page_count,
            duration_seconds: book.duration_seconds,
            format: book.format,
            cover_image_url: book.cover_image_url,
            digital_file_url: book.digital_file_url,
            shelf_location: book.shelf_location,
            total_quantity: book.total_quantity,
            available_quantity: book.available_quantity,
            rating: book.rating,
            is_active: book.is_active,
        }
    }
}

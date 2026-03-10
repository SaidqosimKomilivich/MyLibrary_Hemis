// use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
// use sqlx::FromRow;
// use uuid::Uuid;

/// PostgreSQL ENUM 'rental_status_type' ga mos keluvchi Rust enum
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "rental_status_type", rename_all = "lowercase")]
pub enum RentalStatus {
    Active,
    Returned,
    Overdue,
    Lost,
}

impl std::fmt::Display for RentalStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RentalStatus::Active => write!(f, "active"),
            RentalStatus::Returned => write!(f, "returned"),
            RentalStatus::Overdue => write!(f, "overdue"),
            RentalStatus::Lost => write!(f, "lost"),
        }
    }
}

// #[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
// pub struct BookRental {
//     pub id: Uuid,
//     pub user_id: String,
//     pub book_id: String,
//     pub loan_date: NaiveDate,
//     pub due_date: NaiveDate,
//     pub return_date: Option<NaiveDate>,
//     pub status: RentalStatus,
//     pub notes: Option<String>,
//     pub created_at: Option<chrono::NaiveDateTime>,
//     pub updated_at: Option<chrono::NaiveDateTime>,
// }

// use chrono::NaiveDateTime;
// use serde::{Deserialize, Serialize};
// use sqlx::FromRow;
// use uuid::Uuid;

// #[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
// pub struct Reading {
//     pub id: Uuid,
//     pub user_id: String,
//     pub book_id: String,
//     pub start: Option<NaiveDateTime>,
//     pub finish: Option<NaiveDateTime>,
//     pub book_type: Option<String>,
//     pub audio: Option<i32>,
//     pub page: Option<i32>,
//     pub state: Option<bool>,
// }

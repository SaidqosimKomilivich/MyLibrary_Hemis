use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Control {
    pub id: Uuid,
    pub user_id: String,
    pub arrival: Option<NaiveDateTime>,
    pub departure: Option<NaiveDateTime>,
}

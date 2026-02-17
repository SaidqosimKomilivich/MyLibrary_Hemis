use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::rental::{CreateRentalRequest, RentalFilterParams, ReturnRentalRequest};
use crate::errors::AppError;
use crate::middleware::auth_middleware::{self, Claims};
use crate::services::rental_service::RentalService;

/// POST /api/rentals — Kitob topshirish (faqat admin/staff)
pub async fn create_rental(
    pool: web::Data<PgPool>,
    claims: Claims,
    body: web::Json<CreateRentalRequest>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let response = RentalService::create_rental(pool.get_ref(), body.into_inner()).await?;
    Ok(HttpResponse::Created().json(response))
}

/// PUT /api/rentals/{id}/return — Kitobni qaytarish (faqat admin/staff)
pub async fn return_rental(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<Uuid>,
    body: web::Json<ReturnRentalRequest>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let rental_id = path.into_inner();
    let response =
        RentalService::return_rental(pool.get_ref(), rental_id, body.into_inner()).await?;
    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/rentals — Barcha ijaralar (filtr bilan, faqat admin/staff)
pub async fn get_rentals(
    pool: web::Data<PgPool>,
    claims: Claims,
    query: web::Query<RentalFilterParams>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let params = query.into_inner();
    let response = RentalService::get_rentals(
        pool.get_ref(),
        params.status.as_deref(),
        params.user_id.as_deref(),
    )
    .await?;
    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/rentals/{id} — Bitta ijara (faqat admin/staff)
pub async fn get_rental(
    pool: web::Data<PgPool>,
    claims: Claims,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    if let Err(resp) = auth_middleware::require_role(&claims, &["admin", "staff"]) {
        return Ok(resp);
    }

    let id = path.into_inner();
    let response = RentalService::get_rental_by_id(pool.get_ref(), id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": response
    })))
}

/// GET /api/rentals/my — Foydalanuvchining o'z olgan kitoblari
pub async fn get_my_rentals(
    pool: web::Data<PgPool>,
    claims: Claims,
) -> Result<HttpResponse, AppError> {
    let user_id = &claims.sub;
    let response = RentalService::get_my_rentals(pool.get_ref(), user_id).await?;
    Ok(HttpResponse::Ok().json(response))
}

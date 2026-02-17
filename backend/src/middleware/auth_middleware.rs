use actix_web::{dev::Payload, web, Error, FromRequest, HttpRequest, HttpResponse};
use std::future::{ready, Ready};

use crate::config::Config;
use crate::services::auth_service::AuthService;

/// JWT Claims — handler'larda FromRequest sifatida ishlatiladi.
/// Agar cookie'da access_token bo'lsa va yaroqli bo'lsa, Claims extractordan olinadi.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Claims {
    pub sub: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
    pub token_type: String,
}

impl FromRequest for Claims {
    type Error = Error;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _payload: &mut Payload) -> Self::Future {
        let config = req.app_data::<web::Data<Config>>();

        let result = (|| {
            let config = config
                .ok_or_else(|| {
                    actix_web::error::InternalError::new(
                        "Server konfiguratsiyasi topilmadi",
                        actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                    )
                })?;

            let token = req
                .cookie("access_token")
                .ok_or_else(|| {
                    actix_web::error::InternalError::new(
                        "Avtorizatsiya talab qilinadi",
                        actix_web::http::StatusCode::UNAUTHORIZED,
                    )
                })?;

            let claims = AuthService::validate_token(token.value(), config.get_ref())
                .map_err(|_| {
                    actix_web::error::InternalError::new(
                        "Token yaroqsiz yoki muddati o'tgan",
                        actix_web::http::StatusCode::UNAUTHORIZED,
                    )
                })?;

            if claims.token_type != "access" {
                return Err(actix_web::error::InternalError::new(
                    "Noto'g'ri token turi",
                    actix_web::http::StatusCode::UNAUTHORIZED,
                ));
            }

            Ok(Claims {
                sub: claims.sub,
                role: claims.role,
                exp: claims.exp,
                iat: claims.iat,
                token_type: claims.token_type,
            })
        })();

        ready(result.map_err(|e| e.into()))
    }
}

/// Role-based authorization guard.
/// Handler parametri sifatida ishlatiladi: `RequireRole::new(&["admin", "teacher"])`
///
/// Misol:
/// ```rust
/// pub async fn admin_panel(claims: Claims, _role: RequireRole) -> HttpResponse { ... }
/// ```
///
/// Aktual ishlatish uchun middleware pattern kerak, lekin oddiy holda
/// handler ichida tekshirish qulayroq:
pub fn require_role(claims: &Claims, allowed_roles: &[&str]) -> Result<(), HttpResponse> {
    if allowed_roles.contains(&claims.role.as_str()) {
        Ok(())
    } else {
        Err(HttpResponse::Forbidden().json(serde_json::json!({
            "error": true,
            "message": "Sizda ushbu amalni bajarish uchun ruxsat yo'q"
        })))
    }
}

use chrono::{Duration, Utc};
use rand::Rng;
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::OnceLock;
use uuid::Uuid;

use crate::errors::AppError;

// (Captcha Answer, Expiration Timestamp)
static CAPTCHAS: OnceLock<Mutex<HashMap<String, (i32, i64)>>> = OnceLock::new();
// (Failed Attempts, Block Expiration Timestamp)
static LOGIN_ATTEMPTS: OnceLock<Mutex<HashMap<String, (u8, i64)>>> = OnceLock::new();

pub struct CaptchaService;

impl CaptchaService {
    fn get_captchas() -> &'static Mutex<HashMap<String, (i32, i64)>> {
        CAPTCHAS.get_or_init(|| Mutex::new(HashMap::new()))
    }

    fn get_attempts() -> &'static Mutex<HashMap<String, (u8, i64)>> {
        LOGIN_ATTEMPTS.get_or_init(|| Mutex::new(HashMap::new()))
    }

    /// generates a simple math captcha (addition or subtraction or multiplication)
    pub fn generate_captcha() -> (String, String) {
        let mut rng = rand::thread_rng();
        let num1: i32 = rng.gen_range(1..10);
        let num2: i32 = rng.gen_range(1..10);

        // 0: +, 1: -, 2: *
        let op = rng.gen_range(0..3);
        let (answer, text) = match op {
            0 => (num1 + num2, format!("{} + {}", num1, num2)),
            1 => {
                // To avoid negative numbers for simplicity
                if num1 > num2 {
                    (num1 - num2, format!("{} - {}", num1, num2))
                } else {
                    (num2 - num1, format!("{} - {}", num2, num1))
                }
            }
            _ => (num1 * num2, format!("{} * {}", num1, num2)),
        };

        let captcha_id = Uuid::new_v4().to_string();
        let expires_at = (Utc::now() + Duration::minutes(5)).timestamp();

        let mut captchas = Self::get_captchas().lock().unwrap();

        // Cleanup expired captchas randomly to prevent memory bloat
        if captchas.len() > 1000 {
            let now = Utc::now().timestamp();
            captchas.retain(|_, v| v.1 > now);
        }

        captchas.insert(captcha_id.clone(), (answer, expires_at));

        (captcha_id, text)
    }

    /// verifies if the incoming answer matches the expected value and deletes it.
    pub fn validate_captcha(id: &str, answer: i32) -> Result<(), AppError> {
        let mut captchas = Self::get_captchas().lock().unwrap();
        let now = Utc::now().timestamp();

        if let Some((expected_answer, expires_at)) = captchas.remove(id) {
            if expires_at < now {
                return Err(AppError::BadRequest(
                    "Captcha muddati tugagan. Iltimos, qayta urinib ko'ring.".to_string(),
                ));
            }
            if expected_answer != answer {
                return Err(AppError::BadRequest(
                    "Captcha noto'g'ri. Iltimos, xatosiz hisoblang.".to_string(),
                ));
            }
            Ok(())
        } else {
            Err(AppError::BadRequest(
                "Captcha noto'g'ri yoki topilmadi. Qayta urinib ko'ring.".to_string(),
            ))
        }
    }

    /// checks if the particular user_id is blocked from logging in
    pub fn check_rate_limit(user_id: &str) -> Result<(), String> {
        let mut attempts = Self::get_attempts().lock().unwrap();
        let now = Utc::now().timestamp();

        // random cleanup of expired blocks
        if attempts.len() > 1000 {
            attempts.retain(|_, v| v.0 < 3 || v.1 > now);
        }

        if let Some((count, expires_at)) = attempts.get(user_id) {
            if *count >= 3 && *expires_at > now {
                return Err(format!("{}", *expires_at)); // return expiration timestamp as error string
            } else if *count >= 3 && *expires_at <= now {
                // Block expired, reset count
                attempts.remove(user_id);
            }
        }
        Ok(())
    }

    pub fn record_failed_attempt(user_id: &str) {
        let mut attempts = Self::get_attempts().lock().unwrap();
        let now = Utc::now().timestamp();

        let entry = attempts.entry(user_id.to_string()).or_insert((0, 0));
        entry.0 += 1;

        if entry.0 >= 3 {
            // block for 30 minutes
            entry.1 = now + 1800;
        }
    }

    pub fn clear_attempts(user_id: &str) {
        let mut attempts = Self::get_attempts().lock().unwrap();
        attempts.remove(user_id);
    }
}

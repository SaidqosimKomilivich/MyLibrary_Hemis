use base64::{engine::general_purpose, Engine as _};
use chrono::{Duration, Utc};
use rand::Rng;
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::OnceLock;
use uuid::Uuid;

use crate::errors::AppError;

// (Captcha Answer, Expiration Timestamp)
static CAPTCHAS: OnceLock<Mutex<HashMap<String, (i32, i64)>>> = OnceLock::new();
// (Failed Attempts, Block Expiration Timestamp) — user_id bo'yicha
static LOGIN_ATTEMPTS: OnceLock<Mutex<HashMap<String, (u8, i64)>>> = OnceLock::new();
// (Failed Attempts, Block Expiration Timestamp) — IP manzil bo'yicha
static IP_ATTEMPTS: OnceLock<Mutex<HashMap<String, (u8, i64)>>> = OnceLock::new();

pub struct CaptchaService;

impl CaptchaService {
    fn get_captchas() -> &'static Mutex<HashMap<String, (i32, i64)>> {
        CAPTCHAS.get_or_init(|| Mutex::new(HashMap::new()))
    }

    fn get_attempts() -> &'static Mutex<HashMap<String, (u8, i64)>> {
        LOGIN_ATTEMPTS.get_or_init(|| Mutex::new(HashMap::new()))
    }

    fn get_ip_attempts() -> &'static Mutex<HashMap<String, (u8, i64)>> {
        IP_ATTEMPTS.get_or_init(|| Mutex::new(HashMap::new()))
    }

    /// Matematik misolni SVG rasm sifatida generatsiya qiladi.
    /// Rasm base64 formatda qaytariladi — bot dastur orqali o'qiy olmaydi.
    fn render_svg_captcha(text: &str) -> String {
        let mut rng = rand::thread_rng();

        let width = 160u32;
        let height = 52u32;

        // Fon rangi — och kulrang tonlar
        let bg_r: u8 = rng.gen_range(235..250);
        let bg_g: u8 = rng.gen_range(235..250);
        let bg_b: u8 = rng.gen_range(235..250);

        let mut svg = format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">"
            <rect width="{width}" height="{height}" rx="6" fill="rgb({bg_r},{bg_g},{bg_b})"/>"
        "#
        );

        // Fon shovqini — tasodifiy chiziqlar
        for _ in 0..5 {
            let x1: u32 = rng.gen_range(0..width);
            let y1: u32 = rng.gen_range(0..height);
            let x2: u32 = rng.gen_range(0..width);
            let y2: u32 = rng.gen_range(0..height);
            let r: u8 = rng.gen_range(150..210);
            let g: u8 = rng.gen_range(150..210);
            let b: u8 = rng.gen_range(150..210);
            svg.push_str(&format!(
                "<line x1=\"{x1}\" y1=\"{y1}\" x2=\"{x2}\" y2=\"{y2}\" stroke=\"rgb({r},{g},{b})\" stroke-width=\"1.5\"/>"
            ));
        }

        // Har bir belgi alohida — tasodifiy burish va vertikal siljish bilan
        let chars: Vec<char> = text.chars().collect();
        let char_count = chars.len();
        let step = (width as f32 - 20.0) / (char_count as f32);

        for (i, ch) in chars.iter().enumerate() {
            let x = 12.0 + i as f32 * step + rng.gen_range(-2.0f32..2.0);
            let y: f32 = height as f32 / 2.0 + 8.0 + rng.gen_range(-5.0f32..5.0);
            let rotate: i32 = rng.gen_range(-18..18);
            let font_size: u32 = rng.gen_range(22..28);

            // To'q rang — fon bilan kontrast
            let fr: u8 = rng.gen_range(20..80);
            let fg: u8 = rng.gen_range(20..80);
            let fb: u8 = rng.gen_range(80..160);

            svg.push_str(&format!(
                "<text x=\"{x:.1}\" y=\"{y:.1}\" \
                 font-family=\"monospace,sans-serif\" \
                 font-size=\"{font_size}\" \
                 font-weight=\"bold\" \
                 fill=\"rgb({fr},{fg},{fb})\" \
                 transform=\"rotate({rotate},{x:.1},{y:.1})\">{ch}</text>"
            ));
        }

        // Ustki shovqin nuqtalar
        for _ in 0..30 {
            let cx: u32 = rng.gen_range(0..width);
            let cy: u32 = rng.gen_range(0..height);
            let r: u8 = rng.gen_range(150..200);
            let g: u8 = rng.gen_range(150..200);
            let b: u8 = rng.gen_range(150..200);
            svg.push_str(&format!(
                "<circle cx=\"{cx}\" cy=\"{cy}\" r=\"1.2\" fill=\"rgb({r},{g},{b})\"/>"
            ));
        }

        svg.push_str("</svg>");

        let encoded = general_purpose::STANDARD.encode(svg.as_bytes());
        format!("data:image/svg+xml;base64,{encoded}")
    }

    /// Matematik misol yaratadi va SVG rasm sifatida qaytaradi.
    /// Javob (answer) faqat server xotirasida saqlanadi — clientga yuborilmaydi.
    pub fn generate_captcha() -> (String, String) {
        let mut rng = rand::thread_rng();
        let num1: i32 = rng.gen_range(1..10);
        let num2: i32 = rng.gen_range(1..10);

        // 0: +, 1: -, 2: *
        let op = rng.gen_range(0..3);
        let (answer, text) = match op {
            0 => (num1 + num2, format!("{} + {}", num1, num2)),
            1 => {
                if num1 > num2 {
                    (num1 - num2, format!("{} - {}", num1, num2))
                } else {
                    (num2 - num1, format!("{} - {}", num2, num1))
                }
            }
            _ => (num1 * num2, format!("{} * {}", num1, num2)),
        };

        // Matematik misolni SVG rasmga aylantirish (bot uchun o'qib bo'lmaydi)
        let image_b64 = Self::render_svg_captcha(&text);

        let captcha_id = Uuid::new_v4().to_string();
        let expires_at = (Utc::now() + Duration::minutes(5)).timestamp();

        let mut captchas = Self::get_captchas().lock().unwrap();

        // Muddati o'tgan captchalarni tozalash
        if captchas.len() > 200 {
            let now = Utc::now().timestamp();
            captchas.retain(|_, v| v.1 > now);
        }

        // Faqat answer saqlanadi — text yoki image emas
        captchas.insert(captcha_id.clone(), (answer, expires_at));

        (captcha_id, image_b64)
    }

    /// Kiritilgan javobni tekshiradi va captchani o'chiradi (bir martalik).
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

    // ========================
    // User-ID bo'yicha rate limiting (3 urinish → 30 daqiqa blok)
    // ========================

    pub fn check_rate_limit(user_id: &str) -> Result<(), String> {
        let mut attempts = Self::get_attempts().lock().unwrap();
        let now = Utc::now().timestamp();

        if attempts.len() > 500 {
            attempts.retain(|_, v| v.0 < 3 || v.1 > now);
        }

        if let Some((count, expires_at)) = attempts.get(user_id) {
            if *count >= 3 && *expires_at > now {
                return Err(format!("{}", *expires_at));
            } else if *count >= 3 && *expires_at <= now {
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
            // 30 daqiqa blok
            entry.1 = now + 1800;
        }
    }

    pub fn clear_attempts(user_id: &str) {
        let mut attempts = Self::get_attempts().lock().unwrap();
        attempts.remove(user_id);
    }

    // ========================
    // IP manzil bo'yicha rate limiting (10 urinish → 15 daqiqa blok)
    // ========================

    /// IP manzil bo'yicha tekshirish — distributed brute-force'dan himoya
    pub fn check_ip_rate_limit(ip: &str) -> Result<(), String> {
        let mut attempts = Self::get_ip_attempts().lock().unwrap();
        let now = Utc::now().timestamp();

        if attempts.len() > 1000 {
            attempts.retain(|_, v| v.0 < 10 || v.1 > now);
        }

        if let Some((count, expires_at)) = attempts.get(ip) {
            if *count >= 3 && *expires_at > now {
                return Err(format!("{}", *expires_at));
            } else if *count >= 3 && *expires_at <= now {
                attempts.remove(ip);
            }
        }
        Ok(())
    }

    pub fn record_ip_attempt(ip: &str) {
        let mut attempts = Self::get_ip_attempts().lock().unwrap();
        let now = Utc::now().timestamp();

        let entry = attempts.entry(ip.to_string()).or_insert((0, 0));
        entry.0 += 1;

        if entry.0 >= 3 {
            // 30 daqiqa blok
            entry.1 = now + 1800;
        }
    }

    pub fn clear_ip_attempts(ip: &str) {
        let mut attempts = Self::get_ip_attempts().lock().unwrap();
        attempts.remove(ip);
    }
}

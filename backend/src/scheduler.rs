//! Kutubxona avtomatik chiqish scheduleri
//!
//! Bu modul har kuni soat 20:00 da kutubxonadan chiqmay ketib qolgan
//! foydalanuvchilarni avtomatik ravishda chiqib ketdi deb belgilaydi.

use chrono::{Local, NaiveTime};
use sqlx::PgPool;
use tokio::time::{sleep, Duration};

use crate::repository::control_repository::ControlRepository;

/// Avtomatik chiqish schedulerini fonda ishga tushiradi.
///
/// Har kuni soat **20:00:00** da bir marta ishlaydi:
/// - Bugungi aktiv sessiyalari (departure IS NULL yoki arrival = departure) bo'lgan
///   barcha foydalanuvchilarning departure vaqtini 20:00:00 ga o'rnatadi.
/// - Keyingi kun 20:00 gacha kutadi va tsiklni takrorlaydi.
pub async fn start_auto_checkout_scheduler(pool: PgPool) {
    tracing::info!("🕗 Auto-checkout scheduleri ishga tushdi (har kuni 20:00 da ishlaydi)");

    let target_time = NaiveTime::from_hms_opt(20, 0, 0).expect("20:00:00 vaqtini yaratib bo'lmadi");

    loop {
        let now = Local::now();
        let today_target = now.date_naive().and_time(target_time);

        // Bugungi 20:00 ga necha soniya qolgan?
        let wait_secs = if now.naive_local() < today_target {
            // Hali 20:00 bo'lmagan — bugungi 20:00 gacha kutish
            (today_target - now.naive_local()).num_seconds()
        } else {
            // 20:00 o'tib ketgan — ertangi 20:00 gacha kutish
            let tomorrow_target = today_target + chrono::Duration::hours(24);
            (tomorrow_target - now.naive_local()).num_seconds()
        };

        tracing::info!(
            wait_seconds = wait_secs,
            "⏳ Auto-checkout: {:.1} soatdan keyin ishlaydi",
            wait_secs as f64 / 3600.0
        );

        // Belgilangan vaqtgacha uxlash
        sleep(Duration::from_secs(wait_secs.max(0) as u64)).await;

        // Uyg'ongach — barcha aktiv sessiyalarni yopish
        tracing::info!("🔔 Auto-checkout ishga tushdi: aktiv sessiyalar yopilmoqda...");

        match ControlRepository::auto_depart_all_active(&pool).await {
            Ok(count) => {
                tracing::info!(
                    affected = count,
                    "✅ Auto-checkout: {} ta aktiv sessiya avtomatik yopildi (20:00)",
                    count
                );
            }
            Err(e) => {
                tracing::error!(
                    error = %e,
                    "❌ Auto-checkout xatoligi: aktiv sessiyalarni yopishda muammo yuz berdi"
                );
            }
        }

        // Keyingi sikl uchun bir daqiqa kutish (ikki marta ishlashning oldini olish)
        sleep(Duration::from_secs(60)).await;
    }
}

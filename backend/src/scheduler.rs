//! Kutubxona avtomatik chiqish scheduleri
//!
//! Bu modul har kuni soat 20:00 da kutubxonadan chiqmay ketib qolgan
//! foydalanuvchilarni avtomatik ravishda chiqib ketdi deb belgilaydi.

use chrono::{Local, NaiveTime};
use sqlx::PgPool;
use tokio::time::{sleep, Duration};

use crate::repository::control_repository::ControlRepository;
use crate::repository::message_repository::MessageRepository;
use crate::services::message_service::MessageService;
use crate::dto::message::SendMessageDto;
use std::sync::Arc;

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

/// Kutubxona ijaralari muddati tugashiga doir eslatmalar scheduleri
/// 
/// Har kuni 06:00 da ishlaydi. 
/// Kitobni qaytarish muddatiga (due_date) xuddi 3 kun va 1 kun qolgan barcha
/// faol ijaralarni ("active") qidirib topadi hamda ularning foydalanuvchilariga tizim xabari yozadi.
pub async fn start_rental_reminder_scheduler(pool: PgPool, message_service: Arc<MessageService>) {
    tracing::info!("🔔 Rental-reminder scheduleri ishga tushdi (har kuni 06:00 da ishlaydi)");

    let target_time = NaiveTime::from_hms_opt(6, 00, 0).expect("06:00:00 vaqtini yaratib bo'lmadi");

    loop {
        let now = Local::now();
        let today_target = now.date_naive().and_time(target_time);

        let wait_secs = if now.naive_local() < today_target {
            (today_target - now.naive_local()).num_seconds()
        } else {
            let tomorrow_target = today_target + chrono::Duration::hours(24);
            (tomorrow_target - now.naive_local()).num_seconds()
        };

        tracing::info!(
            wait_seconds = wait_secs,
            "⏳ Rental-reminder: {:.1} soatdan keyin ishlaydi",
            wait_secs as f64 / 3600.0
        );

        sleep(Duration::from_secs(wait_secs.max(0) as u64)).await;

        tracing::info!("🔔 Rental-reminder ishga tushdi: ijaralar tekshirilmoqda...");

        // Faol ijaralar (3 kun yoki 1 kun qolgan, YOKI muddati o'tib ketgan) ni qidirish:
        // due_date - Bugungi kun (CURRENT_DATE) = 3, 1 yoki manfiy son (muddati o'tgan)
        let _query = r#"
            SELECT r.user_id as user_uuid, b.title as book_title,
                   (r.due_date - CURRENT_DATE) as days_left
            FROM book_rentals r
            JOIN book b ON b.id::text = r.book_id
            WHERE r.status = 'active'
              AND (r.due_date - CURRENT_DATE) <= 3
              AND (r.due_date - CURRENT_DATE) != 2 -- we only want exactly 3, 1, 0 or < 0
        "#;

        match sqlx::query!(
            r#"SELECT u.id as user_uuid, b.title as book_title,
                      (r.due_date - CURRENT_DATE) as "days_left!"
               FROM book_rentals r
               JOIN book b ON b.id::text = r.book_id
               JOIN users u ON u.user_id = r.user_id
               WHERE r.status = 'active' 
                 AND (r.due_date - CURRENT_DATE) <= 3
                 AND (r.due_date - CURRENT_DATE) != 2"#
        )
        .fetch_all(&pool)
        .await
        {
            Ok(rentals) => {
                let mut sent_count = 0;
                for rent in rentals {
                    let msg_text = if rent.days_left > 0 {
                        format!(
                            "Diqqat! Siz ijaraga olgan '{}' kitobini topshirish muddatiga {} kun qoldi. Iltimos uni o'z vaqtida qaytaring.",
                            rent.book_title, rent.days_left
                        )
                    } else if rent.days_left == 0 {
                        format!(
                            "Diqqat! Siz ijaraga olgan '{}' kitobini topshirish muddati bugun tugaydi. Iltimos uni bugun qaytaring.",
                            rent.book_title
                        )
                    } else {
                        format!(
                            "Ogohlantirish! Siz ijaraga olgan '{}' kitobini topshirish muddati {} kun oldin o'tib ketgan. Iltimos uni zudlik bilan qaytaring!",
                            rent.book_title, rent.days_left.abs()
                        )
                    };
                    
                    let payload = SendMessageDto {
                        receiver_id: rent.user_uuid,
                        title: "Kitob topshirish eslatmasi".to_string(),
                        message: msg_text,
                    };

                    // sender_id = None means SYSTEM message
                    if let Ok(saved_msg) = MessageRepository::create(&pool, None, &payload).await {
                        message_service.send_message(rent.user_uuid, saved_msg);
                        sent_count += 1;
                    }
                }
                
                tracing::info!(
                    count = sent_count,
                    "✅ Rental-reminder: Eslatmalar jo'natildi"
                );
            }
            Err(e) => {
                tracing::error!("❌ Rental-reminder xatoligi: DB so'rovida muammo - {}", e);
            }
        }

        sleep(Duration::from_secs(60)).await;
    }
}

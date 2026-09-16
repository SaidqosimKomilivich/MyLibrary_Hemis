//! Kutubxona avtomatik chiqish scheduleri
//!
//! Bu modul har kuni soat 20:00 da kutubxonadan chiqmay ketib qolgan
//! foydalanuvchilarni avtomatik ravishda chiqib ketdi deb belgilaydi.

use chrono::{Datelike, Local, NaiveTime};
use sqlx::PgPool;
use tokio::time::{sleep, Duration};

use crate::repository::control_repository::ControlRepository;
use crate::repository::message_repository::MessageRepository;
use crate::services::message_service::MessageService;
use crate::dto::message::SendMessageDto;
use std::collections::HashSet;
use std::path::Path;
use std::sync::Arc;
use std::time::SystemTime;

/// Avtomatik chiqish schedulerini fonda ishga tushiradi.
///
/// Har kuni soat **20:00:00** da bir marta ishlaydi:
/// - Bugungi aktiv sessiyalari (departure IS NULL yoki arrival = departure) bo'lgan
///   barcha foydalanuvchilarning departure vaqtini 20:00:00 ga o'rnatadi.
/// - Keyingi kun 20:00 gacha kutadi va tsiklni takrorlaydi.
pub async fn start_auto_checkout_scheduler(pool: PgPool) {
    tracing::info!("🕗 Auto-checkout scheduleri ishga tushdi (har kuni 20:00 da ishlaydi)");

    let target_time = NaiveTime::from_hms_opt(20, 00, 0).expect("20:00:00 vaqtini yaratib bo'lmadi");

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

    let target_time = NaiveTime::from_hms_opt(06, 00, 0).expect("06:00:00 vaqtini yaratib bo'lmadi");

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

/// Matn (HTML, markdown va h.k.) ichidan barcha `/uploads/...` bilan boshlanuvchi fayl yo'llarini ajratib oladi
fn extract_upload_urls(text: &str) -> Vec<String> {
    let mut urls = Vec::new();
    let mut rest = text;
    while let Some(idx) = rest.find("/uploads/") {
        let after = &rest[idx..];
        // Havola oxirini aniqlash: bo'sh joy, qo'shtirnoq, qavslar, teg belgilari, query parametrlar
        let len = after
            .find(|c: char| {
                c.is_whitespace()
                    || c == '"'
                    || c == '\''
                    || c == '<'
                    || c == '>'
                    || c == ')'
                    || c == '('
                    || c == '\\'
                    || c == '?'
                    || c == '#'
            })
            .unwrap_or(after.len());
        let url = &after[..len];
        if url.len() > "/uploads/".len() {
            urls.push(url.to_string());
        }
        rest = &after[len.max(1)..];
    }
    urls
}

/// Diskdagi yetim (hech qaysi ma'lumotlar bazasi yozuviga bog'lanmagan) fayllarni tozalash scheduleri.
///
/// Har kuni tungi soat **03:00** da bir marta ishlaydi:
/// 1. `uploads/images`, `uploads/pdf`, `uploads/audio` papkalaridagi barcha fayllarni ko'rib chiqadi.
/// 2. Oxirgi 24 soat ichida yuklangan yangi fayllarga tegmaydi (in-progress uploadlar uchun grace period).
/// 3. Baza jadvallaridagi (`book`, `users`, `news`, `announcements`, `news_attachments`) barcha faol URL larni to'playdi,
///    shuningdek `news.content` va `announcements.message` dagi inline fayl va rasmlarni ham tahlil qiladi.
/// 4. Agar fayl 24 soatdan eski bo'lsa va bazada unga havola mavjud bo'lmasa, uni diskdan o'chirib tashlaydi.
pub async fn start_orphan_files_cleanup_scheduler(pool: PgPool, upload_dir: String) {
    tracing::info!("🧹 Orphan-files tozalash scheduleri ishga tushdi (har kuni 03:00 da ishlaydi)");

    let target_time = NaiveTime::from_hms_opt(3, 0, 0).expect("03:00:00 vaqtini yaratib bo'lmadi");

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
            "⏳ Orphan-files tozalash: {:.1} soatdan keyin ishlaydi",
            wait_secs as f64 / 3600.0
        );

        sleep(Duration::from_secs(wait_secs.max(0) as u64)).await;

        tracing::info!("🧹 Orphan-files tozalash jarayoni boshlandi...");

        // 1. Bazadagi barcha havolalarni olish (ustunlar va massivlar)
        let active_urls_res = sqlx::query_scalar::<_, String>(
            r#"
            SELECT cover_image_url FROM "book" WHERE cover_image_url IS NOT NULL AND cover_image_url != ''
            UNION
            SELECT digital_file_url FROM "book" WHERE digital_file_url IS NOT NULL AND digital_file_url != ''
            UNION
            SELECT image_url FROM "users" WHERE image_url IS NOT NULL AND image_url != ''
            UNION
            SELECT unnest(images) FROM "news" WHERE images IS NOT NULL
            UNION
            SELECT unnest(images) FROM "announcements" WHERE images IS NOT NULL
            UNION
            SELECT file_url FROM "news_attachments" WHERE file_url IS NOT NULL AND file_url != ''
            "#
        )
        .fetch_all(&pool)
        .await;

        let mut active_urls: HashSet<String> = match active_urls_res {
            Ok(urls) => urls.into_iter().collect(),
            Err(e) => {
                tracing::error!("❌ Orphan-files: Bazadan havolalarni olishda xatolik: {}", e);
                sleep(Duration::from_secs(60)).await;
                continue;
            }
        };

        // 2. HTML va matnli kontentlar (news.content, announcements.message) ichidagi /uploads/... havolalarini ajratib olish
        let content_texts_res = sqlx::query_scalar::<_, String>(
            r#"
            SELECT content FROM "news" WHERE content LIKE '%/uploads/%'
            UNION ALL
            SELECT message FROM "announcements" WHERE message LIKE '%/uploads/%'
            "#
        )
        .fetch_all(&pool)
        .await;

        match content_texts_res {
            Ok(texts) => {
                let mut inline_count = 0;
                for text in texts {
                    for url in extract_upload_urls(&text) {
                        active_urls.insert(url);
                        inline_count += 1;
                    }
                }
                if inline_count > 0 {
                    tracing::debug!(
                        count = inline_count,
                        "📰 Kontentlar ichidan inline fayl/rasm havolalari topildi va ro'yxatga qo'shildi"
                    );
                }
            }
            Err(e) => {
                tracing::warn!("⚠️ Kontentlardan inline havolalarni olishda xatolik: {}", e);
            }
        }

        let subdirs = ["images", "audio", "pdf"];
        let now_system = SystemTime::now();
        let grace_duration = std::time::Duration::from_secs(24 * 3600); // 24 soat grace period
        let mut deleted_count = 0;
        let mut freed_bytes: u64 = 0;

        for subdir in &subdirs {
            let dir_path = format!("{}/{}", upload_dir, subdir);
            let path = Path::new(&dir_path);
            if !path.exists() || !path.is_dir() {
                continue;
            }

            if let Ok(entries) = std::fs::read_dir(path) {
                for entry in entries.flatten() {
                    let file_path = entry.path();
                    if !file_path.is_file() {
                        continue;
                    }

                    // Fayl yoshi (grace period) tekshiruvi
                    if let Ok(metadata) = entry.metadata() {
                        let is_old_enough = metadata
                            .modified()
                            .or_else(|_| metadata.created())
                            .map(|t| now_system.duration_since(t).unwrap_or_default() >= grace_duration)
                            .unwrap_or(false);

                        if !is_old_enough {
                            continue;
                        }

                        if let Some(file_name) = file_path.file_name().and_then(|n| n.to_str()) {
                            let rel_url = format!("/uploads/{}/{}", subdir, file_name);

                            let is_referenced = active_urls.contains(&rel_url)
                                || (rel_url.len() > 1 && active_urls.contains(&rel_url[1..]))
                                || active_urls.iter().any(|u| u.ends_with(&rel_url) || rel_url.ends_with(u.as_str()));

                            if !is_referenced {
                                let size = metadata.len();
                                if let Err(e) = std::fs::remove_file(&file_path) {
                                    tracing::warn!("Yetim faylni o'chirib bo'lmadi {:?}: {}", file_path, e);
                                } else {
                                    deleted_count += 1;
                                    freed_bytes += size;
                                    tracing::info!(file = %rel_url, size_bytes = size, "🗑️ Yetim fayl diskdan tozalandi");
                                }
                            }
                        }
                    }
                }
            }
        }

        tracing::info!(
            deleted_files = deleted_count,
            freed_mb = (freed_bytes as f64) / (1024.0 * 1024.0),
            "✅ Orphan-files tozalash yakunlandi"
        );

        sleep(Duration::from_secs(60)).await;
    }
}

/// Har haftaning yakshanba kuni soat 02:00 da ishlaydigan HEMIS status tekshiruvi scheduleri
pub async fn start_weekly_status_sync_scheduler(
    pool: PgPool,
    config: crate::config::Config,
    message_service: Arc<MessageService>,
) {
    tracing::info!("🗓️ Haftalik HEMIS status sinxronlash scheduleri ishga tushdi (har yakshanba 02:00 da)");

    let target_time = NaiveTime::from_hms_opt(2, 0, 0).expect("02:00:00 vaqtini yaratib bo'lmadi");

    loop {
        let now = Local::now();
        // Hozirgi haftaning yakshanba kunini topamiz:
        let mut days_until_sunday = (7 + chrono::Weekday::Sun.num_days_from_monday() as i64
            - now.weekday().num_days_from_monday() as i64) % 7;

        let today_target = now.date_naive().and_time(target_time);

        if days_until_sunday == 0 && now.naive_local() >= today_target {
            // Bugun yakshanba, lekin 02:00 o'tib ketgan — keyingi yakshanbagacha 7 kun
            days_until_sunday = 7;
        }

        let next_sunday_date = now.date_naive() + chrono::Duration::days(days_until_sunday);
        let next_target = next_sunday_date.and_time(target_time);
        let wait_secs = (next_target - now.naive_local()).num_seconds().max(0);

        tracing::info!(
            wait_hours = wait_secs as f64 / 3600.0,
            target = %next_target,
            "⏳ Haftalik HEMIS status tekshiruvi: {:.1} soatdan keyin ishlaydi",
            wait_secs as f64 / 3600.0
        );

        sleep(Duration::from_secs(wait_secs as u64)).await;

        tracing::info!("🔔 Haftalik HEMIS status tekshiruvi boshlandi...");
        match crate::services::hemis_service::HemisService::run_weekly_status_check(
            &pool,
            &config,
            Some(message_service.clone()),
        )
        .await
        {
            Ok(report) => {
                tracing::info!(
                    message = %report.message,
                    deactivated = report.deactivated_count,
                    debts = report.users_with_debt.len(),
                    alerts = report.alerts_sent_to_staff,
                    "✅ Haftalik HEMIS status tekshiruvi muvaffaqiyatli yakunlandi"
                );
            }
            Err(e) => {
                tracing::error!(error = %e, "❌ Haftalik status tekshiruvida xatolik yuz berdi");
            }
        }

        // Qayta ishga tushib ketmasligi uchun 5 daqiqa kutish
        sleep(Duration::from_secs(300)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_upload_urls() {
        let html = r#"
            <p>Salom dunyo!</p>
            <img src="/uploads/images/abc-123.webp" alt="Rasm" />
            <a href="/uploads/pdf/hujjat-456.pdf">Yuklab olish</a>
            <p>Full URL: <img src="https://example.com/uploads/images/def-789.jpg?v=1#header" /></p>
            <div style="background-image: url('/uploads/images/bg.png')"></div>
        "#;

        let urls = extract_upload_urls(html);
        assert!(urls.contains(&"/uploads/images/abc-123.webp".to_string()));
        assert!(urls.contains(&"/uploads/pdf/hujjat-456.pdf".to_string()));
        assert!(urls.contains(&"/uploads/images/def-789.jpg".to_string()));
        assert!(urls.contains(&"/uploads/images/bg.png".to_string()));
    }
}



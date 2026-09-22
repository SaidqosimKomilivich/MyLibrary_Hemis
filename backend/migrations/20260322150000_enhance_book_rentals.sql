-- Kitob ijaralari jadvalini takomillashtirish
-- 1. Kitobni topshirgan mas'ul xodim ID si
ALTER TABLE "book_rentals"
ADD COLUMN IF NOT EXISTS "issued_by_user_id" VARCHAR(255);

-- 2. Faol ijaralarda invois raqami bo'yicha indeks (tezkor tekshiruv va qidiruv uchun)
CREATE INDEX IF NOT EXISTS "idx_rentals_invoice_active"
ON "book_rentals" ("invoice_number")
WHERE "status" = 'active';

-- 3. Topshirgan xodim bo'yicha indeks
CREATE INDEX IF NOT EXISTS "idx_rentals_issued_by"
ON "book_rentals" ("issued_by_user_id");

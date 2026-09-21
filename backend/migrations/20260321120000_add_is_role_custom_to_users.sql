ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_role_custom" BOOLEAN NOT NULL DEFAULT FALSE;

-- Hozirgi admin va staff larni avtomatik tarzda maxsus (qo'lda tayinlangan) deb belgilaymiz
UPDATE "users" SET "is_role_custom" = TRUE WHERE "role" IN ('admin', 'staff');

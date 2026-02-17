-- digital_file_url va cover_image_url uchun kengaytirilgan hajm
-- VARCHAR(255) ko'pincha yetmaydi, TEXT turini ishlatamiz
ALTER TABLE "book" ALTER COLUMN "digital_file_url" TYPE TEXT;
ALTER TABLE "book" ALTER COLUMN "cover_image_url" TYPE TEXT;

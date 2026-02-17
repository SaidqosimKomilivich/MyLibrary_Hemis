-- book_rentals jadvali uchun alohida trigger funksiya yaratamiz
-- update_timestamp_column() faqat "departure" ustunini yangilaydi (control uchun)
-- Bu funksiya esa "updated_at" ustunini yangilaydi

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP(0);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Eski triggerni o'chirib, yangisini ulaymiz
DROP TRIGGER IF EXISTS "update_rentals_timestamp" ON "book_rentals";

CREATE TRIGGER "update_rentals_timestamp"
BEFORE UPDATE ON "book_rentals"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

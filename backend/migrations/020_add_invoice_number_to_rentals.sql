-- Kitob ijaralari jadvaliga invois raqami ustunini qo'shish
-- Invois raqami — kutubxona tomonidan kitobning har bir fizik nusxasiga beriladigan unikal ID
ALTER TABLE "book_rentals"
ADD COLUMN "invoice_number" VARCHAR(100);

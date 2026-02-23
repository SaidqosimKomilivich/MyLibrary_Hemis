-- submitted_by ustuni: o'qituvchi kim yuborganini saqlash
ALTER TABLE "book"
    ADD COLUMN IF NOT EXISTS "submitted_by" VARCHAR(255);

-- submitted_by bo'yicha index (teacher o'z kitoblarini tez topishi uchun)
CREATE INDEX IF NOT EXISTS idx_book_submitted_by ON "book" ("submitted_by");

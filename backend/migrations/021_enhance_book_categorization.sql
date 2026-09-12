-- Add target_audience column to book table
ALTER TABLE "book" ADD COLUMN IF NOT EXISTS "target_audience" VARCHAR(255);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_book_target_audience ON "book" ("target_audience");
CREATE INDEX IF NOT EXISTS idx_book_genre ON "book" ("genre");

-- Data migration: reclassify existing records that were previously saved in category
-- 1. Move publication types / genres to genre column
UPDATE "book"
SET "genre" = "category",
    "category" = NULL
WHERE "genre" IS NULL 
  AND "category" IN ('badiiy_adabiyot', 'ilmiy_ommabop', 'darslik_metodik', 'monografiya', 'lugat_entsiklopediya');

-- 2. Move target audiences to target_audience column
UPDATE "book"
SET "target_audience" = "category",
    "category" = NULL
WHERE "target_audience" IS NULL 
  AND "category" IN ('bolalar_uchun', 'osmirlar_uchun', 'mutaxassislar_uchun');

-- 013_news_multiple_images.sql

-- O'zgarishlar: Yagona 'cover_image_url' olib tashlanib, 'images' massivi o'rnatiladi.

ALTER TABLE news
    DROP COLUMN IF EXISTS cover_image_url,
    ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';

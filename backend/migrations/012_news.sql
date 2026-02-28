-- ============================================================
-- 012_news.sql  —  Yangiliklar (news) jadvali
-- ============================================================

CREATE TABLE IF NOT EXISTS news (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Asosiy mazmun
    title           VARCHAR(512)  NOT NULL CHECK (char_length(trim(title)) >= 3),
    slug            VARCHAR(600)  NOT NULL UNIQUE,
    summary         TEXT,
    content         TEXT          NOT NULL CHECK (char_length(trim(content)) >= 10),

    -- Media
    cover_image_url TEXT,

    -- Klassifikatsiya
    category        VARCHAR(128),
    tags            TEXT[]        NOT NULL DEFAULT '{}',

    -- Muallif
    author_id       UUID          REFERENCES users(id) ON DELETE SET NULL,

    -- Holat
    is_published    BOOLEAN       NOT NULL DEFAULT FALSE,
    published_at    TIMESTAMPTZ,

    -- Vaqt tamg'alari
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Saralash va filtr uchun indekslar
CREATE INDEX IF NOT EXISTS idx_news_slug         ON news (slug);
CREATE INDEX IF NOT EXISTS idx_news_is_published ON news (is_published);
CREATE INDEX IF NOT EXISTS idx_news_category     ON news (category);
CREATE INDEX IF NOT EXISTS idx_news_author_id    ON news (author_id);
CREATE INDEX IF NOT EXISTS idx_news_created_at   ON news (created_at DESC);

-- updated_at ni avtomatik yangilash uchun trigger
CREATE OR REPLACE FUNCTION news_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_news_updated_at ON news;
CREATE TRIGGER trg_news_updated_at
    BEFORE UPDATE ON news
    FOR EACH ROW
    EXECUTE FUNCTION news_set_updated_at();

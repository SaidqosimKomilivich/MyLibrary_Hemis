-- ============================================================
-- 022_enhance_news.sql — Yangiliklar modulini yaxshilash
-- ============================================================

-- 1. Ko'rishlar soni ustuni
ALTER TABLE news ADD COLUMN IF NOT EXISTS views BIGINT NOT NULL DEFAULT 0;

-- 2. Qadab qo'yish ustuni (pinned/featured)
ALTER TABLE news ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Hujjatlar jadvali
CREATE TABLE IF NOT EXISTS news_attachments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id       UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    file_url      TEXT NOT NULL,
    file_name     TEXT NOT NULL,
    file_size     BIGINT NOT NULL DEFAULT 0,
    file_type     VARCHAR(20) NOT NULL,
    sort_order    INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indekslar
CREATE INDEX IF NOT EXISTS idx_news_views ON news (views DESC);
CREATE INDEX IF NOT EXISTS idx_news_is_pinned ON news (is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_attachments_news_id ON news_attachments (news_id);

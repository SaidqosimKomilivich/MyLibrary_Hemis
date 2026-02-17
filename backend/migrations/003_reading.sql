-- Agar UUID funksiyasi ishlamasa, ushbu qatorni bir marta ishlating:
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "reading" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(100) NOT NULL,
    "book_id" VARCHAR(100) NOT NULL,
    "start" TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "finish" TIMESTAMP(0) WITHOUT TIME ZONE,
    "book_type" VARCHAR(50), -- "bookType" o'rniga "book_type" tavsiya etiladi
    "audio" INTEGER,
    "page" INTEGER,
    "state" BOOLEAN DEFAULT FALSE
);
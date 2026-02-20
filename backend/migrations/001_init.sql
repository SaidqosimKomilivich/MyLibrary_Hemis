-- 1. UUID funksiyasi uchun kengaytma
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Users jadvali
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(50) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student', 'teacher', 'staff')),
    "full_name" VARCHAR(100) NOT NULL,
    "short_name" VARCHAR(50),
    "birth_date" DATE,
    "image_url" TEXT,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "id_card" BIGINT NOT NULL DEFAULT 0,
    "department_name" VARCHAR(100),
    "specialty_name" VARCHAR(100),
    "group_name" VARCHAR(50),
    "education_form" VARCHAR(50),
    "staff_position" VARCHAR(100),
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_password_update" BOOLEAN NOT NULL DEFAULT FALSE
);

-- 3. Indexlar
CREATE INDEX idx_users_email ON "users" ("email");
CREATE INDEX idx_users_phone ON "users" ("phone");
CREATE INDEX idx_users_role ON "users" ("role");
CREATE INDEX idx_users_user_id ON "users" ("user_id");

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Refresh tokens jadvali
CREATE TABLE "refresh_tokens" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,
    "replaced_by_token" TEXT,
    "user_agent" TEXT,
    "client_ip" VARCHAR(45),
    CONSTRAINT fk_user
        FOREIGN KEY ("user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE
);

-- 6. Refresh tokens indexlari
CREATE INDEX idx_refresh_tokens_token ON "refresh_tokens" ("token");
CREATE INDEX idx_refresh_tokens_user_id ON "refresh_tokens" ("user_id");

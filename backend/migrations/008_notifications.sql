-- 8. Notifications jadvali
CREATE TABLE "notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, -- Receiver
    "sender_id" UUID REFERENCES "users"("id") ON DELETE SET NULL, -- Sender (NULL = System)
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')),
    "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexlar
CREATE INDEX idx_notifications_user_id ON "notifications" ("user_id");
CREATE INDEX idx_notifications_is_read ON "notifications" ("is_read");
CREATE INDEX idx_notifications_created_at ON "notifications" ("created_at");

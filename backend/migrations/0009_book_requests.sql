CREATE TABLE IF NOT EXISTS "book_requests" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "book_id" UUID NOT NULL REFERENCES "book"("id") ON DELETE CASCADE,
    "request_type" VARCHAR(50) NOT NULL, -- 'physical', 'electronic'
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'rejected'
    "employee_comment" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

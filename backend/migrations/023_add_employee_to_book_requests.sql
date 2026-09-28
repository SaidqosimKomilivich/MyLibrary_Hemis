ALTER TABLE "book_requests" ADD COLUMN IF NOT EXISTS "employee_id" UUID REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_book_requests_employee_id ON "book_requests"("employee_id");


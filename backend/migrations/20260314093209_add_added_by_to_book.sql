-- book jadvaliga added_by ustunini qo'shish (kitobni qaysi admin/xodim qo'shganini saqlash)
ALTER TABLE "book" 
ADD COLUMN IF NOT EXISTS "added_by" UUID REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_book_added_by ON "book" ("added_by");

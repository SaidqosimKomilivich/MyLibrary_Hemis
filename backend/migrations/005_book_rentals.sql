-- 1-QADAM: Status uchun maxsus 'ENUM' turi yaratamiz.
DO $$ BEGIN
    CREATE TYPE rental_status_type AS ENUM ('active', 'returned', 'overdue', 'lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2-QADAM: Jadvalni yaratish
CREATE TABLE "book_rentals" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    "user_id" VARCHAR(255) NOT NULL, 
    "book_id" VARCHAR(255) NOT NULL,
    
    "loan_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "due_date" DATE NOT NULL,
    
    "return_date" DATE, 
    
    "status" rental_status_type NOT NULL DEFAULT 'active',
    
    "notes" TEXT,
    
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3-QADAM: Indekslash
CREATE INDEX "idx_rentals_user_id" ON "book_rentals" ("user_id");
CREATE INDEX "idx_rentals_book_id" ON "book_rentals" ("book_id");
CREATE INDEX "idx_rentals_status" ON "book_rentals" ("status");

-- 4-QADAM: Trigger
CREATE TRIGGER "update_rentals_timestamp"
BEFORE UPDATE ON "book_rentals"
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

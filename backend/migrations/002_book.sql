-- Kitoblar jadvali
CREATE TABLE "book" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "author" VARCHAR(255) NOT NULL,
    "subtitle" VARCHAR(255),
    "translator" VARCHAR(255),
    "isbn_13" VARCHAR(13),
    "isbn_10" VARCHAR(10),
    "publisher" VARCHAR(255),
    "publication_date" INTEGER,
    "edition" VARCHAR(255),
    "language" VARCHAR(255),
    "category" VARCHAR(255),
    "genre" VARCHAR(255),
    "description" TEXT,
    "page_count" INTEGER,
    "duration_seconds" INTEGER,
    "format" VARCHAR(255),
    "cover_image_url" VARCHAR(255),
    "digital_file_url" VARCHAR(255),
    "shelf_location" VARCHAR(255),
    "total_quantity" INTEGER DEFAULT 0,
    "available_quantity" INTEGER DEFAULT 0,
    "rating" DOUBLE PRECISION DEFAULT 0,
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "book_pkey" PRIMARY KEY ("id")
);

-- Indexlar
CREATE INDEX idx_book_title ON "book" ("title");
CREATE INDEX idx_book_author ON "book" ("author");
CREATE INDEX idx_book_category ON "book" ("category");
CREATE INDEX idx_book_isbn_13 ON "book" ("isbn_13");
CREATE INDEX idx_book_is_active ON "book" ("is_active");

-- updated_at trigger
CREATE TRIGGER update_book_updated_at
    BEFORE UPDATE ON "book"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

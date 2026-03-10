-- Add category and images to announcements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS images TEXT[];

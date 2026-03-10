-- Add announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add announcement_reads table to track who read which announcement
CREATE TABLE IF NOT EXISTS announcement_reads (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, announcement_id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_announcements_sender_id ON announcements(sender_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON announcement_reads(announcement_id);

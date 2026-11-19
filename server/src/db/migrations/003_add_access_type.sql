-- 003_add_access_type.sql
ALTER TABLE book_sources ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'free';
CREATE INDEX IF NOT EXISTS idx_book_sources_access_type ON book_sources (access_type);

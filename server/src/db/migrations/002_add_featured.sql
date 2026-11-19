-- 002_add_featured.sql
ALTER TABLE books ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_books_featured ON books (featured);

-- 005_add_categories_locked.sql
ALTER TABLE books ADD COLUMN IF NOT EXISTS categories_locked BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_books_categories_locked ON books (categories_locked);

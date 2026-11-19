-- 001_init.sql
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  authors TEXT,
  edition TEXT,
  year INTEGER,
  description TEXT,
  cover_url TEXT,
  search_vector TSVECTOR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS book_subjects (
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, subject_id)
);

CREATE TABLE IF NOT EXISTS book_courses (
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, course_id)
);

CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS book_sources (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  official_url TEXT NOT NULL,
  direct_file_url TEXT,
  license TEXT NOT NULL,
  license_url TEXT,
  can_host BOOLEAN NOT NULL DEFAULT FALSE,
  last_checked_at TIMESTAMP,
  link_status TEXT NOT NULL DEFAULT 'unknown'
);

CREATE TABLE IF NOT EXISTS book_requests (
  id SERIAL PRIMARY KEY,
  requested_title TEXT NOT NULL,
  notes TEXT,
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_search_vector ON books USING GIN (search_vector);

CREATE OR REPLACE FUNCTION books_search_vector_update() RETURNS TRIGGER AS $$
DECLARE
  subj TEXT;
BEGIN
  SELECT string_agg(s.name, ' ') INTO subj
  FROM book_subjects bs
  JOIN subjects s ON s.id = bs.subject_id
  WHERE bs.book_id = NEW.id;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.authors, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(subj, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_books_search_vector ON books;
CREATE TRIGGER trg_books_search_vector
BEFORE INSERT OR UPDATE OF title, authors ON books
FOR EACH ROW EXECUTE FUNCTION books_search_vector_update();

CREATE OR REPLACE FUNCTION refresh_book_search_vector(p_book_id INTEGER) RETURNS VOID AS $$
DECLARE
  subj TEXT;
  b RECORD;
BEGIN
  SELECT * INTO b FROM books WHERE id = p_book_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT string_agg(s.name, ' ') INTO subj
  FROM book_subjects bs
  JOIN subjects s ON s.id = bs.subject_id
  WHERE bs.book_id = p_book_id;

  UPDATE books SET
    search_vector =
      setweight(to_tsvector('english', coalesce(b.title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(b.authors, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(subj, '')), 'C'),
    updated_at = NOW()
  WHERE id = p_book_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION book_subjects_search_refresh() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_book_search_vector(OLD.book_id);
    RETURN OLD;
  ELSE
    PERFORM refresh_book_search_vector(NEW.book_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_book_subjects_refresh ON book_subjects;
CREATE TRIGGER trg_book_subjects_refresh
AFTER INSERT OR UPDATE OR DELETE ON book_subjects
FOR EACH ROW EXECUTE FUNCTION book_subjects_search_refresh();

# Free Textbook Finder

Prototype web app to help students find legally free textbooks (public domain, openly licensed, or officially published open-access) across **all subjects** — science, mathematics, business, nursing, medicine, humanities, social sciences, and more. This app stores metadata and links only and does not host book files.

## Tech stack
- Frontend: React (Vite), React Router, plain CSS
- Backend: Node.js with Express (ESM)
- Database: PostgreSQL with full-text search (`tsvector` + GIN index)

## Prerequisites
- Node.js and npm (tested with Node v24.15.0, npm 11.12.1)
- PostgreSQL running locally

## Setup

### 1. Install dependencies
```powershell
cd server && npm install
cd ../client && npm install
```

### 2. Create environment configuration
Copy `.env.example` to `.env` at the repo root and fill in the values:

```
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/free_textbook_finder
ADMIN_PASSWORD=your_admin_password
VITE_API_BASE_URL=http://localhost:3001/api
```

Optionally create `client/.env` with `VITE_API_BASE_URL=http://localhost:3001/api` for the frontend.

Environment variable names (set real values yourself):
- `PORT` — backend server port
- `DATABASE_URL` — PostgreSQL connection string
- `ADMIN_PASSWORD` — password for admin routes (sent as `x-admin-password` header)
- `VITE_API_BASE_URL` — base URL for the API from the client

> `.env` is in `.gitignore` and must never be committed. Only `.env.example` is committed.

### 3. Create the database
```powershell
createdb free_textbook_finder
```
(or use pgAdmin / psql / your preferred PostgreSQL client)

### 4. Run database migrations
```powershell
cd server && npm run migrate
```
This applies `server/src/db/migrations/001_init.sql`, `002_add_featured.sql`, `003_add_access_type.sql`, and `004_add_categories.sql`, creating the `books`, `subjects`, `courses`, `categories`, `book_subjects`, `book_courses`, `book_categories`, `sources`, `book_sources`, and `book_requests` tables plus full-text search indexes, triggers, a `featured` column on books, and an `access_type` column on book sources.

### 5. Seed verified book data
```powershell
cd server && npm run seed
```
This loads `server/src/db/seed/books.json` into the database (upserts by title + edition, refreshes search vectors, removes books no longer in the seed, and cleans up orphaned subjects/courses/categories/sources). The seed contains 34 manually verified records from OpenStax, Open Textbook Library, Pressbooks, BCcampus, and Milne Open Textbooks across medicine, nursing, science, mathematics, business, social sciences, and humanities. Each record has a confirmed `license` and `official_url` copied from the official source page.

### 6. Run the backend
```powershell
cd server && npm run dev
```
The API listens on `PORT` (default 3001). Health check: `GET /api/health`

### 7. Run the frontend
```powershell
cd client && npm run dev
```
The Vite dev server runs on port 5173 by default and proxies `/api` to the backend via Vite proxy config.

## Features
- Search books by title, author, description, subject, course, category, or source
- Browse by general category (Medicine and Health, Nursing, Science, Mathematics, Engineering and Technology, Business, Social Sciences, Humanities, Computer Science, Education, Languages, Law)
- Full-text search with relevance ranking; default (no query) lists featured books first, then alphabetically
- Book detail pages showing license, official source links, subjects, courses, and category
- License labels shown on every search result card
- "Download PDF" button for books with a direct PDF link; "Open book page" otherwise
- "Request this book" link on empty search results, prefilled with the search term
- Book request form with rate limiting (30 requests per 15 minutes)
- Admin dashboard for managing books, book sources, featured flag, and request statuses
- All external links open in a new tab with `rel="noopener noreferrer"`

## API endpoints

### Public
- `GET /api/health` — health check
- `GET /api/books?q=&subject=&course=&source=&page=&limit=` — search/filter/paginate books with full-text search ranking
- `GET /api/books/:id` — book detail with subjects, courses, and sources (each source shows `license`, `official_url`, `license_url`)
- `GET /api/subjects` — list subjects
- `GET /api/courses` — list courses
- `GET /api/categories` — list categories
- `GET /api/sources` — list sources
- `POST /api/requests` — submit a book request (rate limited: 30 per 15 minutes; validates `requested_title`, optional `notes`, `contact`)

### Admin (require `x-admin-password` header matching `ADMIN_PASSWORD`)
- `POST /api/admin/books` — create a book
- `PUT /api/admin/books/:id` — update a book
- `DELETE /api/admin/books/:id` — delete a book
- `POST /api/admin/book-sources` — add a book source (requires `book_id`, `source_id`, `official_url`, `license`)
- `PUT /api/admin/book-sources/:id` — update a book source
- `DELETE /api/admin/book-sources/:id` — delete a book source
- `GET /api/admin/requests` — list book requests
- `PATCH /api/admin/requests/:id` — update request status (`new`, `found`, `rejected`)

## UI
- `/` — home with search form, category/subject/course filters, and featured books
- `/search` — search results with subject/course/category/source filters
- `/books/:id` — book detail showing license, category, and official source links (links open in a new tab with `rel="noopener noreferrer"`)
- `/request` — book request form
- `/admin` — admin dashboard (login with `ADMIN_PASSWORD`) for managing books, sources, featured flag, and requests

## Legal / verification policy
- Only legal free sources are indexed: public domain, openly licensed, or officially published open-access textbooks.
- No pirated or shadow-library sites are linked or mentioned.
- Every `book_sources` record stores `license` and `official_url`.
- Every seed record was verified against its official source page before inclusion.
- The app never hosts, copies, or downloads book files — it only links to official sources.

## Seeds
The seed file is `server/src/db/seed/books.json`. To add more verified books, append records to that array and re-run `npm run seed` (it upserts by title + edition). The import script `server/src/import/openstax.js` can also be used to bulk-import all live OpenStax books from the official API.

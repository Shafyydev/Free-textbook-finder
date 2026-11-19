Free Textbook Finder - Prototype Spec
This document is the single source of truth for the prototype. Read all of it before writing any code. If something is not specified here, ask instead of guessing.
1. Project summary
Free Textbook Finder is a web app that helps students, mainly medical and allied health students (MBBS, physiotherapy, nursing), find textbooks that are legally free. Many of these students do not know which websites distribute open-access or openly licensed books. The student types a book name, subject or author, sees which legal free sources have it, and opens the book's page or file in as few clicks as possible.
The app is a search and discovery layer. In the prototype it stores metadata and links only. It does not host any book files.
2. Hard rules (must never be broken)
1.  Only index legal free sources: public domain, openly licensed (for example Creative Commons), or officially published open-access books.
2.  Never add, link to, scrape, or mention pirated or shadow-library sites, in code, seed data, comments, or UI. No exceptions, not even as an extra option.
3.  Every book source entry must store its license and the official URL of the page where the book is legitimately offered.
4.  The prototype does not download, copy, or host any book files. It links out to the official source.
5.  Before using any site's API or data feed, check that site's official documentation and terms. Do not scrape a site whose terms forbid it. If unsure, use manually curated seed data instead.
6.  Do not invent books, URLs, or licenses. Every seed record must be verified by opening the real official page.
3. Prototype goal and scope
Goal: a working end-to-end demo that proves the core flow: search a book, see legal free sources, click through to the official page.
In scope
• One-box search with full-text search over title, author and subject
• Filters: subject, course (for example MBBS Year 1, Physiotherapy, Nursing), source
• Book detail page listing every free source with license label and an "Open" button
• Browse by course page, for students who do not know a title
• "Request a book" form when nothing is found
• Simple admin page (password protected) to add or edit books, sources and view requests
• Seed data of 30 to 50 manually verified books
Out of scope for the prototype
• Student accounts and saved books
• Hosting or serving book files
• Automatic crawling of many sites
• Payments, ads, mobile app
4. Tech stack
• Frontend: React (Vite), React Router, plain CSS or Tailwind
• Backend: Node.js with Express
• Database: PostgreSQL, using built-in full-text search (tsvector and GIN index)
• Language: JavaScript or TypeScript (pick one at the start and use it everywhere)
• Config: environment variables in a .env file, with a .env.example committed
5. Folder structure
free-textbook-finder/
  client/              React app
    src/
      pages/           Home, SearchResults, BookDetail, Browse, RequestBook, Admin
      components/      SearchBar, BookCard, SourceList, Filters
      api/             functions that call the backend
  server/
    src/
      routes/          books.js, requests.js, admin.js
      db/              pool, migrations, seed
      middleware/      adminAuth, errorHandler
      index.js
  README.md
  SPEC.md              this document
6. Database schema
books
• id (primary key)
• title (text, required)
• authors (text)
• edition (text, optional)
• year (integer, optional)
• description (text, optional)
• cover_url (text, optional)
• search_vector (tsvector, generated from title, authors and subject names, with a GIN index)
• created_at, updated_at
subjects
• id, name (for example Anatomy, Physiology, Biochemistry, Physiotherapy)
courses
• id, name (for example MBBS Year 1, BPT, Nursing)
book_subjects (book_id, subject_id) and book_courses (book_id, course_id) - many-to-many link tables
sources
• id, name (for example OpenStax, NCBI Bookshelf), base_url, notes
book_sources
• id
• book_id, source_id (foreign keys)
• official_url (text, required): the official page for the book on that source
• direct_file_url (text, optional): only if the source itself publishes a direct file link
• license (text, required): for example "CC BY 4.0", "Public domain", "Open access - see source"
• license_url (text, optional)
• can_host (boolean, default false): reserved for the future; the prototype ignores it and never hosts files
• last_checked_at, link_status (ok, broken, unknown)
book_requests
• id, requested_title, notes, contact (optional), status (new, found, rejected), created_at
7. Backend API
All responses are JSON. Use parameterized queries only (no string-built SQL).
• GET /api/books?q=&subject=&course=&source=&page=&limit= : search and filter. When q is present, rank by full-text relevance. Default limit 20, max 50.
• GET /api/books/:id : one book with its subjects, courses and all sources.
• GET /api/subjects and GET /api/courses : lists for filters and browse page.
• POST /api/requests : create a book request. Validate: requested_title required, max lengths enforced.
• Admin routes (require the admin password via a header or session):
    ◦ POST, PUT, DELETE /api/admin/books
    ◦ POST, PUT, DELETE /api/admin/book-sources
    ◦ GET /api/admin/requests, PATCH /api/admin/requests/:id
Edge cases to handle: empty search returns recent or featured books, no results returns an empty list plus the request-a-book prompt, invalid ids return 404, errors return a clean JSON message without stack traces.
8. Frontend pages
1.  Home: one large search box, a short line explaining the app, and course shortcuts (MBBS, Physiotherapy, Nursing).
2.  Search results: list of book cards (title, authors, subjects, number of free sources), filters on the side or top, pagination. Empty state shows the request form link.
3.  Book detail: title, authors, edition, description, and a list of sources. Each source row shows the source name, a license label, and an "Open" button linking to official_url (and a "Direct file" button only if direct_file_url exists). Open links in a new tab with rel="noopener noreferrer".
4.  Browse: choose a course, then subject, then see books.
5.  Request a book: simple form.
6.  Admin: login, then tables and forms to manage books, sources and requests.
UI rules: the interface is for non-technical students. Keep it very simple, large text, one clear search box, mobile friendly, no jargon. Always show the license next to every source so the student knows it is legitimately free.
9. Seed data (important)
The prototype is seeded with 30 to 50 books, collected by hand from these official sources. Verify each one by opening the real page and copying the real URL and license. Do not guess.
• OpenStax (openstax.org): openly licensed textbooks, including anatomy and physiology, microbiology, biology and chemistry titles
• NCBI Bookshelf (ncbi.nlm.nih.gov/books): biomedical books; the license differs per book, so record it per book and link to the official book page
• Open Textbook Library (open.umn.edu/opentextbooks)
• Directory of Open Access Books (doabooks.org) and OAPEN (oapen.org)
• Indian government platforms such as the National Digital Library of India and e-PG Pathshala, where their terms allow linking
Store the seed as a JSON or CSV file in server/src/db/seed/ and load it with a seed script. Each record must contain: title, authors, edition, subjects, courses, source name, official_url, license.
An optional later step is an import script for a single source that offers an official API or metadata feed. Confirm in that source's official documentation that programmatic access is allowed, and respect its rate limits.
10. Build order
Complete one step at a time. Run and test before moving on. Commit after each step.
1.  Initialize the repo, folders, .env.example and README.
2.  Set up PostgreSQL, write migrations for all tables, and the full-text search index.
3.  Write the seed script and load the verified seed data.
4.  Build GET /api/books, GET /api/books/:id, subjects and courses endpoints, then test them.
5.  Build the React app shell, routing, Home page and SearchBar.
6.  Build Search results with filters and pagination.
7.  Build Book detail with the source list and license labels.
8.  Build Browse by course.
9.  Build the request-a-book form and endpoint.
10.  Build the admin login and admin management pages.
11.  Add input validation, error handling and basic rate limiting on public POST routes.
12.  Write the README: setup steps, environment variables, how to seed, how to run.
11. Quality requirements
• Parameterized SQL only; validate and length-limit all input; escape output (React does this by default; never use dangerouslySetInnerHTML).
• Admin password and database credentials come from environment variables, never hard-coded or committed.
• Add a few tests for the search endpoint and the request endpoint.
• Handle loading and error states in the UI.
• Clear, consistent naming and short comments only where logic is not obvious.
12. Definition of done for the prototype
• Searching "anatomy" returns relevant seeded books, ranked sensibly.
• A book page shows every source with a license label and a working official link.
• Browsing by course works.
• A request submitted from the UI appears in the admin page.
• The app runs locally from the README instructions with no extra steps.
• No pirated or unverified sources exist anywhere in the data.
13. Future phases (do not build now)
• Student accounts and saved books
• Scheduled metadata refresh and broken-link checker
• Hosting files only for books whose license allows redistribution (CC BY, CC BY-SA or public domain), with attribution kept, using the can_host field
• Takedown handling process
• Deployment with a public domain

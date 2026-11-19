# Free Textbook Finder

Prototype web app to help students find textbooks that are legally free (public domain, openly licensed, or officially published open-access). This app stores metadata and links only and does not host book files.

## Tech stack
- Frontend: React (Vite), React Router, plain CSS
- Backend: Node.js with Express
- Database: PostgreSQL with full-text search (\	svector\ + GIN index)

## Prerequisites
- Node.js and npm
- PostgreSQL running locally

## Setup
1. Install dependencies:
   - \cd server && npm install\
   - \cd client && npm install\
2. Create a \.env\ from \.env.example\ at repo root (or in server/client as configured) and set:
   - \DATABASE_URL\
   - \PORT\
   - \ADMIN_PASSWORD\
   - \VITE_API_BASE_URL\
3. Create database:
   - \createdb free_textbook_finder\ (or equivalent)
4. Run migrations:
   - \cd server && npm run migrate\
5. Seed verified data:
   - \cd server && npm run seed\
6. Run backend:
   - \cd server && npm run dev\
7. Run frontend:
   - \cd client && npm run dev\

## Notes
- All seed records are manually verified official sources with recorded license and official URL.
- The prototype never hosts, copies, or downloads book files.

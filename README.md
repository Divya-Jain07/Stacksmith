# Stacksmith

Stacksmith is a full-stack, multi-tenant library operations and inventory management system built for admins, librarians, and members. It provides role-based dashboards for managing books, physical copies, members, borrowing workflows, fines, reports, and real-time helpdesk chat.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a deeper look at how the system is put together.

## Table of Contents

- [Features](#features)
- [Demo Credentials](#demo-credentials)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Main Routes](#main-routes)
- [Real-Time Chat](#real-time-chat)
- [CSV Bulk Import](#csv-bulk-import)
- [Notes](#notes)

## Features

### Admin
- View dashboard analytics and library activity summaries
- Manage the book catalog — add, update, and delete books
- Add and manage physical book copies
- Bulk import books from CSV
- Manage members and librarian accounts
- Issue, renew, and return books from the counter console
- Confirm member borrowing and return requests
- Track, pay, and waive fines
- Use the staff chat hub for member support

### Librarian
- Access operational dashboard metrics
- Manage catalog records and book copies
- Handle counter operations for issuing, renewing, and returning books
- Manage members
- Review and manage fines
- Respond to member helpdesk chats

### Member
- Log in with a member code
- Browse the catalog
- Request books and cancel pending requests
- View borrowing history and fines
- Start and continue helpdesk chat conversations

### Authentication and Authorization
- JWT-based authentication with separate staff and member login flows
- Role-based route protection on the frontend and API authorization on the backend
- Supported roles: `SuperAdmin`, `Admin`, `Librarian`, and `Member`

## Demo Credentials

For demo purposes, use the following login IDs.

| Role | Login ID |
|---|---|
| Admin | `admin@selfwise.com` |
| Librarian | `jane@selfwise.com` |
| Librarian | `james@selfwise.com` |
| Member | `MEM-5770` |
| Member | `MEM-5408` |
| Member | `MEM-3454` |

Password for all demo accounts:

```text
password123
```

Demo users can explore and use the application features available to their role, except changing the password. The system also supports a private SuperAdmin role for platform-level administration; SuperAdmin credentials are not shared in the public demo.

## Tech Stack

**Frontend**
- React + Vite
- React Router
- Tailwind CSS
- Framer Motion
- Lucide React icons
- Socket.IO Client

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JSON Web Tokens + bcryptjs
- Multer (CSV/file uploads)
- Socket.IO

## Project Structure

```
Stacksmith/
├── backend/
│   └── src/
│       ├── config/         # DB connection
│       ├── controllers/    # admin, auth, book, borrow, chat, fine, member, report logic
│       ├── middlewares/    # auth (JWT + roles), tenant scoping, logging, error handling
│       ├── models/         # User, Member, LibrarianStaff, Book, BookCopy, BorrowingHistory,
│       │                   #   BookReservation, Fine, Conversation, Message
│       ├── routes/         # /api/admin, /api/auth, /api/books, /api/borrow, /api/chat, etc.
│       ├── socket/          # Socket.IO chat handler
│       ├── utils/           # ApiError, catchAsync, fineCalculator, transaction
│       ├── app.js
│       └── index.js
└── frontend/
    └── src/
        ├── components/      # Landing sections, Navbar, auth/ProtectedRoute, layout
        ├── context/          # Auth, Theme, Dialog context
        ├── pages/            # LoginPage, UnauthorizedPage, and role dashboards
        │   └── dashboards/   # SuperAdmin, Admin, Librarian, Member dashboards
        ├── services/         # REST API client + Socket.IO client
        └── constants/        # Role constants
```

## Getting Started

### Prerequisites
- Node.js and npm
- A MongoDB Atlas account or a local MongoDB instance

### Environment Variables

**Backend** — create a `.env` file inside `backend/` (see `backend/.env.example`):

```env
PORT=5000
MONGO_URI=mongodb+srv://<db_user>:<db_password>@your-cluster-placeholder.mongodb.net/?appName=Cluster0
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
```

**Frontend** — create a `.env.local` file inside `frontend/` if you need to override the API URL:

```env
VITE_API_URL=
```

When `VITE_API_URL` is empty, the Vite dev server proxies `/api` requests to `http://localhost:5000`. For production, set it to the deployed backend URL.

### Installation

```bash
git clone <repository-url>
cd Stacksmith

cd backend && npm install
cd ../frontend && npm install
```

### Running Locally

Start the backend:

```bash
cd backend
npm run dev
```

Runs at `http://localhost:5000`.

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

Runs at `http://localhost:5173`. Open that URL in your browser.

## Deployment

Live demo: [stacksmith-beta.vercel.app](https://stacksmith-beta.vercel.app/)

## Main Routes

**Frontend**

| Route | Description |
|---|---|
| `/` | Public landing page |
| `/login` | Unified login page |
| `/super-admin/*` | Super admin dashboard |
| `/admin/*` | Admin dashboard |
| `/librarian/*` | Librarian dashboard |
| `/member/*` | Member dashboard |
| `/unauthorized` | Unauthorized access page |

**Backend API** — all routes are prefixed with `/api`

| API Route | Purpose |
|---|---|
| `/api/auth` | SuperAdmin bootstrap, admin/librarian creation, staff/member login, password change |
| `/api/admin` | Cross-tenant analytics, librarian and admin management (SuperAdmin/Admin) |
| `/api/books` | Book catalog, copies, and CSV bulk import |
| `/api/copies` | Manual copy status/condition updates |
| `/api/members` | Member management and self-service data |
| `/api/borrow` | Issue, return, renew, and borrowing requests |
| `/api/reservations` | Book reservations / catalog holds |
| `/api/fines` | Fine tracking, payment, and waiver |
| `/api/reports` | Dashboard analytics |
| `/api/chat` | Chat conversations and messages |

## Real-Time Chat

The backend creates a single shared HTTP server for both Express and Socket.IO. Socket.IO handles real-time chat between members and staff — conversation creation, claiming/assignment, messaging, and closing all happen over WebSocket events rather than REST polling.

Default local WebSocket endpoint:

```text
ws://localhost:5000
```

## CSV Bulk Import

Admins and librarians can bulk import books from a CSV file through the catalog API. The backend uses Multer to temporarily receive the uploaded file before processing it.

Expected CSV columns:

```text
Title,Author,ISBN,Genre,Language,Publisher,YearPublished,Copies,description
```

Example:

```csv
Title,Author,ISBN,Genre,Language,Publisher,YearPublished,Copies,description
Atomic Habits,James Clear,9780735211292,Self-help,English,Avery,2018,5,A practical guide to building better habits.
The Alchemist,Paulo Coelho,9780061122415,Fiction,English,HarperOne,1988,3,A philosophical novel about dreams and destiny.
```

## Notes

- **Demo Credentials:** Demo accounts (`admin@selfwise.com`, `jane@selfwise.com`, `MEM-5770`, etc.) are for seeded fake demonstration data only. In production, real credentials are generated securely.
- Do not commit real `.env` files.
- Use a strong `JWT_SECRET` (at least 32 characters in production).
- Restrict CORS origins via `ALLOWED_ORIGINS` before production deployment.

## Testing & Quality Assurance

To run the complete backend test suite:

```bash
cd backend
npm ci
npm test
```

- **In-Memory MongoDB Replica Set:** Tests spin up an in-memory replica set via `mongodb-memory-server` so MongoDB multi-document transactions and rollbacks run natively during tests without requiring external database dependencies.
- **Tenant Guard Enforce Mode:** `TENANT_GUARD=enforce` is active by default in tests and in production, blocking any unscoped database queries that omit `adminId`.
- **Coverage:** 117 automated tests covering tenant isolation, circulation transactions, concurrent borrow limit serialization, query parser hardening, regex escaping, and fine operations.

## Smart Search & AI Features

Stacksmith includes an intelligent **Smart Search** and **More Like This** recommendation system for catalog exploration:
- **Hybrid Retrieval:** Combines exact keyword & regex matching with semantic similarity over Google Gemini embeddings (`gemini-embedding-2`), merged via Reciprocal Rank Fusion (RRF).
- **Graceful Fallback:** If the embedding API key is absent or the external provider fails/times out, search automatically degrades to keyword search with an `X-Degraded-Search` flag instead of returning 500.
- **Privacy & Performance:** Only book metadata (title, author, genre, description) is embedded. No member data is ever sent to the provider. Responses exclude embedding vectors by default. Book creation responds immediately and triggers embedding generation in the background.
- **Cost Controls:** Per-user rate limiting (15 requests/minute per authenticated user), daily query budget (default 500, configurable via `DAILY_AI_BUDGET`), and in-memory LRU query cache.

### Required Environment Variables

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `MONGO_URI` | MongoDB connection URI | `mongodb+srv://...` |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) | `development` |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars in production) | `your_secret_here` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins | `http://localhost:5173,https://your-domain.vercel.app` |
| `TENANT_GUARD` | Tenant guard mode (`enforce`, `warn`, `off`) | `enforce` (prod/test), `warn` (dev) |
| `USE_PUBLIC_DNS` | Force public DNS servers `1.1.1.1` and `8.8.8.8` | `false` |
| `GEMINI_API_KEY` | Google Gemini API key for embeddings | `your_gemini_api_key` |
| `EMBEDDING_MODEL` | Embedding model name | `gemini-embedding-2` |
| `EMBEDDING_DIMENSION` | Output vector dimension | `768` |
| `DAILY_AI_BUDGET` | Daily limit on smart search embedding calls | `500` |
| `VITE_API_URL` | Frontend API base URL | `http://localhost:5000` |

## Counter Console & Return Preview

The Counter Console features a live loan preview when returning books:
- Entering a barcode immediately loads the borrower details, due date, and overdue status.
- If overdue, a clear overdue banner displays the days overdue and exact fine amount.
- Staff can choose **Return & Mark Fine Paid** (collecting cash immediately) or **Return, Fine Stays Pending**.
- If mark-as-paid fails, the return is preserved and staff are prompted to retry without losing loan state.
- A persistent result card retains loan and payment details after processing.

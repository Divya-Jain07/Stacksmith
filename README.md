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
│       ├── utils/           # ApiError, catchAsync, fineCalculator, validation
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

- Do not commit real `.env` files.
- Use a strong `JWT_SECRET` outside local development.
- Restrict CORS origins before production deployment.
- The provided demo accounts are intended only for demonstration and review.

## Smart Search & AI Features
Stacksmith features a **Smart Search** and **More Like This** recommendation system for members exploring the catalog. 
- **Retrieval Only:** This feature uses semantic embeddings to find books by mood, theme, or topic (e.g. "a book about space travel" or "something like Harry Potter"). No LLM is used to generate text.
- **Privacy First:** No member data is sent to the embedding provider. Only the book catalog data (title, author, genre, description) is embedded.

*Note: For the best Smart Search experience, ensure books have comprehensive descriptions. Current catalog description coverage is ~83%.*

## Testing & Stability
Stacksmith has comprehensive automated test coverage for concurrency, tenant isolation, and borrowing logic.
- **Test Suite:** 95 tests covering circulation flows, tenant boundaries, and fine calculation.
- **Tenant Isolation:** The tenant guard is actively running in **enforce** mode across both tests and production to prevent data leakage.
- **CI Status:** The test suite runs automatically on push/PR via GitHub Actions.
- **Evaluation:** Smart Search evaluation results by query kind (vague, mood, ISBN, etc.) will be documented once measured against the full catalog.

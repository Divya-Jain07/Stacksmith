# Stacksmith Library Management System

Stacksmith is a full-stack library operations and inventory management system built for admins, librarians, and members. It provides role-based dashboards for managing books, physical copies, members, borrowing workflows, fines, reports, and real-time helpdesk chat.

The project is split into two applications:

- `backend` - Express.js, MongoDB, JWT authentication, REST APIs, and Socket.IO chat
- `frontend` - React, Vite, Tailwind CSS, role-based dashboards, and Socket.IO client

## Features

### Admin

- View dashboard analytics and library activity summaries
- Manage the book catalog
- Add, update, and delete books
- Add and manage physical book copies
- Bulk import books from CSV
- Manage members
- Manage librarian accounts
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
- Request books
- Cancel pending requests
- View borrowing history
- View fines
- Start and continue helpdesk chat conversations

### Authentication and Authorization

- JWT-based authentication
- Separate staff and member login flows
- Role-based route protection on the frontend
- Role-based API authorization on the backend
- Supported roles: `SuperAdmin`, `Admin`, `Librarian`, and `Member`

## Demo Credentials

For demo purposes, use the following login IDs.

| Role | Login ID |
| --- | --- |
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

Demo users can explore and use the application features available to their role, except changing the password.

Note: The system also supports a private SuperAdmin role for platform-level administration. SuperAdmin credentials are not shared in the public demo.

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Tailwind CSS
- Framer Motion
- Lucide React icons
- Socket.IO Client

### Backend

- Node.js
- Express.js
- MongoDB with Mongoose
- JSON Web Tokens
- bcryptjs
- Multer
- Socket.IO

## Project Structure

```text
Stacksmith/
  backend/
    src/
      config/
      controllers/
      middlewares/
      models/
      routes/
      socket/
      utils/
      app.js
      index.js
    .env.example
    package.json

  frontend/
    public/
    src/
      components/
      context/
      pages/
      services/
      constants/
      App.jsx
      main.jsx
    .env.example
    package.json
```

## Prerequisites

Make sure the following are installed:

- Node.js
- npm
- MongoDB Atlas account or a local MongoDB instance

## Environment Variables

### Backend

Create a `.env` file inside `backend` using `backend/.env.example` as a reference.

```env
PORT=5000
MONGO_URI=mongodb+srv://<db_user>:<db_password>@cluster0.nj03qxi.mongodb.net/?appName=Cluster0
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
```

### Frontend

Create a `.env.local` file inside `frontend` if you need to override the API URL.

```env
VITE_API_URL=
```

When `VITE_API_URL` is empty, the Vite development server proxies `/api` requests to `http://localhost:5000`.

For production, set `VITE_API_URL` to the deployed backend URL.

## Installation

Clone the repository and install dependencies for both applications.

```bash
git clone <repository-url>
cd finalProject
```

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

## Running Locally

Start the backend server:

```bash
cd backend
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

Start the frontend development server in a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

Open `http://localhost:5173` in your browser.

## Deployment

Live Demo:

[https://stacksmith-beta.vercel.app](https://stacksmith-beta.vercel.app/)

## Available Scripts

### Backend

```bash
npm run dev
```

Starts the backend using Nodemon.

```bash
npm start
```

Starts the backend using Node.

### Frontend

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Builds the frontend for production.

```bash
npm run preview
```

Previews the production build locally.

```bash
npm run lint
```

Runs Oxlint.

## Main Routes

### Frontend

| Route | Description |
| --- | --- |
| `/` | Public landing page |
| `/login` | Unified login page |
| `/super-admin/*` | Super admin dashboard |
| `/admin/*` | Admin dashboard |
| `/librarian/*` | Librarian dashboard |
| `/member/*` | Member dashboard |
| `/unauthorized` | Unauthorized access page |

### Backend API

All backend API routes are prefixed with `/api`.

| API Route | Purpose |
| --- | --- |
| `/api/auth` | Registration, staff login, member login, password change |
| `/api/admin` | Admin analytics and librarian management |
| `/api/books` | Book catalog and book copy management |
| `/api/copies` | Physical copy updates |
| `/api/members` | Member management and member account data |
| `/api/borrow` | Issue, return, renew, and borrowing requests |
| `/api/reservations` | Book reservations |
| `/api/fines` | Fine tracking, payment, and waiver |
| `/api/reports` | Dashboard reports |
| `/api/chat` | Chat conversations and messages |

## Real-Time Chat

The backend creates a shared HTTP server for Express and Socket.IO. Socket.IO is used for real-time chat between members and staff.

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

## Production Build

Build the frontend:

```bash
cd frontend
npm run build
```

Run the backend in production mode with a production MongoDB connection string and a strong `JWT_SECRET`.

```bash
cd backend
npm start
```

## Notes

- Do not commit real `.env` files.
- Use a strong `JWT_SECRET` outside local development.
- Restrict CORS origins before production deployment.
- The provided demo accounts are intended only for demonstration and review.

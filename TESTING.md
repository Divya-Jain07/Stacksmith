# Stacksmith Backend Testing Guide

This document explains the backend test suite in a format that is easy to read on GitHub and easy to maintain as the project grows.

## Overview

Stacksmith now includes an automated backend test suite that catches regressions before release. The current suite runs in CI and locally, and it is built around real HTTP requests, database transactions, and tenant-scoped security checks.

### Current status

| Metric | Value |
|---|---|
| Test files | 6 |
| Total tests | 117 |
| Runtime | ~12 seconds |
| CI trigger | Every push and PR to `main`, `master`, or `dev` |
| Database | In-memory MongoDB replica set |
| Guard mode in tests | `enforce` |

**Result:** `117 passed, 117 total`.

---

## Why this suite exists

Before this testing phase, correctness depended on manual checks. That was risky because several issues are not visible in the UI and only show up under real request flow or concurrency.

| Risk | Why it matters |
|---|---|
| Tenant isolation | One tenant could accidentally read or mutate another tenant's data |
| Concurrency | Two simultaneous issue requests could both succeed for the same copy |
| Transaction safety | A failed operation could leave the database in a partially updated state |

These problems require automated checks, not visual inspection.

---

## Testing stack

### Jest + Supertest

- **Jest** is the standard Node.js test runner.
- **Supertest** sends real HTTP requests against the Express app without needing to run a full server instance.
- This gives us end-to-end validation of routing, middleware, validation, security checks, and error handling.

### In-memory MongoDB replica set

MongoDB transactions require a replica set. A standalone `mongod` instance cannot run them. The project uses `mongodb-memory-server` to start a real MongoDB binary in memory, configured as a single-node replica set.

This gives us:

- No external MongoDB installation required
- Clean database state for every run
- Automatic teardown when tests finish

### Serial execution with `--runInBand`

All suites share one in-memory MongoDB instance. Running tests in parallel can create database contention and flakey failures. Using `--runInBand` keeps each test file isolated and predictable.

---

## Project test structure

```text
backend/
├── jest.config.js
├── tests/
│   ├── setup.js
│   ├── factory.js
│   ├── isolation.test.js
│   ├── concurrency.test.js
│   ├── circulation.test.js
│   ├── fines.test.js
│   ├── tenantGuard.test.js
│   └── securityHardening.test.js
├── .github/
│   └── workflows/
│       └── backend-tests.yml
└── package.json
```

---

## Shared test infrastructure

### `tests/setup.js`

This file provides the shared environment for all test files.

It does the following:

1. Sets `TENANT_GUARD=enforce` and `JWT_SECRET` before models are imported.
2. Starts the in-memory MongoDB replica set in `beforeAll`.
3. Connects Mongoose to it.
4. Clears all collections in `afterEach` to keep each test independent.
5. Closes the DB and tears down the replica set in `afterAll`.

### Why clear collections instead of dropping them?

Dropping collections also removes indexes. Clearing documents is faster and keeps the schema intact.

> Important: any test that creates data in `beforeAll` will be removed by `afterEach` before the next test runs. That is why the suite uses `beforeEach` in test files that need fresh data per test.

---

## Factory helpers

### `tests/factory.js`

This file creates a complete tenant branch in the database for tests. One call to `createBranch()` creates:

- an admin user
- a librarian user and profile
- a member user and profile
- one book
- one book copy with `available` status
- signed JWT tokens for library staff and member access

### Why `crypto.randomBytes` is used

Using `Date.now()` can create duplicate values when multiple records are created in rapid succession. `crypto.randomBytes(4).toString('hex')` creates a unique random value and avoids duplicate-key errors in tests.

---

## Test files explained

### `isolation.test.js` — tenant isolation

This file checks that one branch cannot access another branch's records.

| Test | What it proves |
|---|---|
| Branch A librarian cannot read Branch B's book | Cross-tenant book reads are blocked |
| Branch A librarian cannot issue Branch B's copy | Copy ownership is enforced |
| Branch A librarian cannot confirm Branch B's borrowing | Borrowing actions are tenant-scoped |
| Debug route returns 404 | Legacy debug route is not available |
| `updateBook` cannot change `availableCopies` | The allowlist for updates is respected |

This file is especially important because tenant data leaks are easy to miss in manual testing.

### `concurrency.test.js` — concurrent borrow attempts

This proves that two simultaneous `POST /api/borrow/issue` requests for the same copy produce exactly one success and one failure.

```text
req1 ─────► API
req2 ─────► API
     │
     ▼
MongoDB transaction
findOneAndUpdate(copy, { status: 'available' -> 'borrowed' })
     │
     ├─ one request wins
     └─ other request gets WriteConflict
```

The losing request returns `500` because `WriteConflict` is a transient infrastructure error, not a validation failure. The test accepts any status `>= 400` for the loser.

### `circulation.test.js` — full borrowing lifecycle

This file verifies the complete circulation flow, including state transitions, availability counters, fines, and transaction rollback.

#### Case 1: request → confirm → return → fine

1. Member requests a book.
2. Librarian confirms issue with a future due date.
3. The due date is backdated in the database to simulate overdue behaviour.
4. The librarian returns the book.
5. The copy becomes available again and a fine is generated.

#### Case 2: cancel request

A member can request a copy, then cancel it. The reserved count is reversed and the borrowing record is removed.

#### Case 3: rollback safety

This is the most important integrity test.

- A borrowing is created and the copy is marked as borrowed.
- A mocked failure happens in the middle of the return transaction.
- The API returns an error.
- The borrowing remains active.
- The copy remains borrowed.
- No fine is created.

This confirms the transaction is truly atomic.

### `fines.test.js` — fine calculation

These are unit tests for `calculateOverdueFine`.

| Scenario | Expected |
|---|---|
| On time | `0` |
| Early return | `0` |
| 1 second late | 1 day of fine |
| Exactly 2 days late | 2 days of fine |
| 2 days + 1 minute late | 3 days of fine |

The last case is critical: any started day counts as a full day, enforced by `Math.ceil`.

### `tenantGuard.test.js` — tenant guard plugin

This suite validates the `tenantGuard` Mongoose plugin across the guarded models.

It checks that the plugin is installed, that unscoped queries are rejected, that valid tenant-scoped queries pass, and that cross-tenant opt-out is only allowed with a reason.

### `securityHardening.test.js` — security hardening & edge cases

This suite covers 21 regression tests corresponding to the architectural hardening problems:

| Category | What it proves |
|---|---|
| Member fines route isolation | Member calling `/api/fines/member/:id` receives 403 Forbidden; `/api/fines/me` returns only their own fines. |
| Member profile updates | Member cannot modify `membershipType`, `borrowLimits`, `status`, or `membershipExpiryDate` (returns 403); immutable fields (`userId`, `memberCode`) are stripped. |
| Book creation mass assignment | Client-supplied `availableCopies`, `totalCopies`, or vector data are ignored on book creation. |
| Search regex escaping | Search queries containing regex special characters (`C++`, `(`, `[`, `{`, `?`, `*`) are escaped and return 200 without regex crashes or 500 errors. |
| Embedding data protection | Book responses omit vector embeddings; search degrades gracefully to keyword search with `X-Degraded-Search` header when AI call fails. |
| Concurrency & limits | Serialized borrow transactions prevent a member with limit 1 from acquiring 2 books simultaneously; transient conflicts return clean 4xx (409). |
| Query parameter injection | Query parameters with object syntax (`?status[$ne]=...`) or array types return 400 Bad Request. |
| Renewal validation | Renewal requests with invalid dates, past dates, or extensions exceeding 30 days return 400 Bad Request. |
| Fine collection audit | Fines collected or waived by Admin/SuperAdmin record `collectedByUser` with the acting user's ID. |
| SuperAdmin tenant filter | Malformed `adminId` query parameters to SuperAdmin endpoints return 400 Bad Request instead of throwing a 500 error. |

---

## CI workflow

GitHub Actions runs the backend tests automatically.

### `.github/workflows/backend-tests.yml`

The workflow:

1. Checks out the repo
2. Installs Node.js 20
3. Runs `npm ci`
4. Runs `npm test`

### Why no MongoDB service is configured

`mongodb-memory-server` downloads and starts the database automatically during the test run.

### Why `npm ci`

`npm ci` installs exactly the versions recorded in `package-lock.json`, making CI reproducible and consistent with local runs.

---

## Bugs discovered while writing tests

Writing tests exposed real problems.

### Bug 1: unscoped `Member.findOne`

In `src/middlewares/auth.middleware.js`, the member lookup was missing the tenant filter.

```js
// Before
const member = await Member.findOne({ userId: req.user.id });

// After
const member = await Member.findOne({
  userId: req.user.id,
  adminId: req.user.adminId,
});
```

This caused 500 errors in enforce mode when a member accessed their own resources.

### Bug 2: using `document.save()` in tests

This was not a production bug; it was a test-side pattern issue. Updating a copy with `.save()` is not tenant-scoped in the same way as a query-level filter, and the tenant guard rejects it.

```js
await BookCopy.updateOne(
  { _id: copy._id, adminId },
  { $set: { status: 'reserved' } }
);
```

This is the correct pattern for test and production code.

---

## Summary

- The backend test suite protects critical business rules.
- It validates tenant isolation, borrower flows, financial logic, and atomic database updates.
- It catches regressions before production.
- It also surfaced real bugs that would otherwise have been missed.

For local execution:

```bash
cd backend
npm test
```

This is the fastest way to verify the full backend suite in the same way CI does.

# Phase 3: Test Suite — What, How & Why

## Overview

Phase 3 adds a complete automated backend test suite to Stacksmith. Before this phase, the app had zero tests — correctness depended entirely on manual checking. After this phase, **95 tests** across 5 test files run automatically on every push and pull request, catching regressions before they reach production.

**Final result:** `95 passed, 95 total` — all green, every time.

---

## Why Tests Were Needed

Three concrete risks existed before Phase 3:

| Risk | What could go wrong |
|---|---|
| **Tenant isolation** | A bug in any controller could silently expose one library branch's data to another |
| **Concurrency** | Two simultaneous book issues could both succeed, creating two borrowing records for one copy |
| **Transaction safety** | A crash midway through a multi-step operation (issue/return/cancel) could leave the database in a half-updated, inconsistent state |

None of these are detectable by visual testing — they require either carefully crafted requests or simultaneous load. The test suite makes them impossible to miss.

---

## Infrastructure Decisions

### Why Jest + Supertest?
- **Jest** is the standard Node.js test runner. `--runInBand` runs suites sequentially to avoid connection pool conflicts between test files.
- **Supertest** lets tests fire real HTTP requests against the Express app without starting an actual server — the test gets a real end-to-end response including middleware, auth, and error handling.

### Why an In-Memory Replica Set?
MongoDB **transactions** (used in Phase 1.5 for atomic circulation operations) require a replica set — a single standalone `mongod` instance cannot run transactions at all. The `mongodb-memory-server` package spins up a real MongoDB binary entirely in RAM, configured as a single-node replica set. This means:
- Tests run anywhere (CI, local Windows, Mac, Linux) — no MongoDB installation needed.
- Each test run starts from a completely empty database.
- The replica set is torn down automatically after all tests finish.

### Why `--runInBand` (serial execution)?
All test suites share one in-memory MongoDB connection. Running suites in parallel (Jest's default) would have multiple suites reading/writing the same database at the same time, causing spurious failures. Serial execution (`--runInBand`) makes each suite's `afterEach` cleanup predictable.

---

## Files Created

```
backend/
├── jest.config.js              ← Jest configuration
├── tests/
│   ├── setup.js                ← Shared test infrastructure
│   ├── factory.js              ← Test data builder
│   ├── isolation.test.js       ← Tenant isolation regression tests
│   ├── concurrency.test.js     ← Simultaneous-request tests
│   ├── circulation.test.js     ← Full borrowing lifecycle tests
│   ├── fines.test.js           ← Fine calculation unit tests
│   └── tenantGuard.test.js     ← Tenant guard plugin tests
└── .github/
    └── workflows/
        └── backend-tests.yml   ← GitHub Actions CI workflow
```

---

## `tests/setup.js` — Shared Infrastructure

**What it does:**
1. Sets `TENANT_GUARD=enforce` and `JWT_SECRET` **before any model is imported** — this is critical because the tenant guard reads its mode at schema-registration time. If the env variable were set after `require('../src/models')`, the guard would load in the wrong mode.
2. Starts the in-memory MongoDB replica set in `beforeAll`.
3. Connects Mongoose to it.
4. In `afterEach`, deletes all documents from every collection — this is the key isolation mechanism that ensures each test starts from a clean slate.
5. Disconnects and stops the replica set in `afterAll`.

**Why `afterEach` clears collections instead of dropping them?**
Dropping a collection removes its indexes. Re-creating indexes on every test would add seconds of overhead per test file. Clearing documents is instant and preserves the schema.

**Important consequence:** Any test file that creates data in `beforeAll` will find that data gone by the second test, because `afterEach` runs between tests. This is why all test files that need fresh data per test use `beforeEach` instead of `beforeAll`.

---

## `tests/factory.js` — Test Data Builder

**What it does:** Creates a complete, self-contained library branch in the database and returns everything needed to interact with it via the API.

**What one `createBranch()` call creates:**
1. An **Admin** user (who is their own `adminId` — the tenant root)
2. A **Librarian** user + their `LibrarianStaff` profile
3. A **Member** user + their `Member` profile
4. One **Book**
5. One **BookCopy** for that book (status: `available`)
6. Signed **JWT tokens** for the librarian and member, ready to use in `Authorization: Bearer` headers

**Why use `crypto.randomBytes` for unique IDs?**
`Date.now()` is only millisecond-precise. When `createBranch()` is called twice in quick succession (e.g. to create `branchA` and `branchB`), `Date.now()` would produce the same value for email addresses, barcodes, etc., causing Mongoose `duplicate key` errors on unique fields. `crypto.randomBytes(4).toString('hex')` produces a random 8-character hex string — unique regardless of timing.

---

## Test Files Explained

### `isolation.test.js` — Tenant Isolation (5 tests)

**Purpose:** Regression tests for the Phase 1 security fixes. These tests prove that the fixes actually work and will catch it immediately if a future code change accidentally undoes them.

| Test | What it proves |
|---|---|
| Branch A librarian cannot read Branch B's book | `GET /api/books/:id` correctly returns 404 when the book belongs to another tenant |
| Branch A librarian cannot issue Branch B's copy | `POST /api/borrow/issue` returns 400 — the copy doesn't appear in Branch A's scope |
| Branch A librarian cannot confirm Branch B's borrowing | `PATCH /api/borrow/:id/confirm-issue` returns 404 and the borrowing status is unchanged |
| Debug route returns 404 | The `GET /api/borrow/debug/:barcode` route was deleted in Phase 1.2 |
| `updateBook` cannot change `availableCopies` | The field allowlist in `updateBook` (Phase 1.4) works |

**Why `beforeEach` and not `beforeAll`?**
Because `setup.js`'s `afterEach` clears the database after every test. If branches were only created once (`beforeAll`), they would be gone by the second test.

**Why `BookCopy.updateOne(...)` instead of `copy.status = 'reserved'; copy.save()`?**
In enforce mode, Mongoose's `Document.save()` internally issues queries that the tenant guard intercepts. The guard requires a query-level `adminId` filter, which `save()` does not produce in the same way. Using `BookCopy.updateOne({ _id, adminId }, { $set })` is explicit and tenant-scoped, so the guard accepts it.

---

### `concurrency.test.js` — Concurrency (1 test)

**Purpose:** Prove that two simultaneous `POST /api/borrow/issue` requests for the same copy produce exactly one success and one failure, with no duplicate borrowing records.

**How it works:**

```
req1 ─────────────────────► API
req2 ─────────────────────► API  (fired at the exact same time via Promise.all)
         ↓
   MongoDB transaction:
   findOneAndUpdate(copy, {status: 'available'→'borrowed'})
         ↓
   One transaction wins the write lock.
   The other gets a WriteConflict error (code 112, TransientTransactionError).
```

**Why does the losing request return 500 (WriteConflict) instead of 400?**
A MongoDB `WriteConflict` is a transient infrastructure error, not a user error — it means two transactions competed and one had to be aborted. The error handler correctly maps it to a 500. The test accepts any status `>= 400` for the loser.

**What makes this test meaningful:** Without the atomic `findOneAndUpdate` conditional update introduced in Phase 1.5, both requests could pass a naïve availability check and create two `BorrowingHistory` records. The test would then fail because `borrowings.length` would be 2.

---

### `circulation.test.js` — Circulation Lifecycle (3 tests)

**Purpose:** Prove the full borrowing workflow is correct end-to-end, including state transitions, counter accuracy, fine generation, and transaction atomicity.

#### Test 1: Request → Confirm → Return → Fine

The full lifecycle through the API:
1. Member calls `POST /api/borrow/request` → copy becomes `reserved`, `availableCopies` decrements
2. Librarian calls `PATCH /api/borrow/:id/confirm-issue` (with a valid **future** due date) → copy becomes `borrowed`, borrowing becomes `Active`
3. Directly backdate the `dueDate` in the DB to 2 days ago (simulates overdue without waiting)
4. Librarian calls `POST /api/borrow/return` → copy back to `available`, `availableCopies` increments, fine created

**Why use a future due date and then backdate it?**
`confirmIssue` validates that `dueDate > now` (Phase 1.3). Sending a past date returns 400. To test fine generation, the dueDate must be in the past at the time of return — so a valid future date is set during confirmation, then the DB record is backdated directly using `BorrowingHistory.updateOne(...)` before the return call.

#### Test 2: Cancel Request

Member requests → counter decrements → member cancels → counter restores. The `BorrowingHistory` record is deleted entirely.

#### Test 3: Transaction Rollback

**This is the most important test for data integrity.**

1. Issue the book via the API so the borrowing is `Active` and the copy is `borrowed`.
2. Use `jest.spyOn(Book, 'updateOne').mockRejectedValueOnce(...)` to inject a failure at the **third** step of the `processReturn` transaction (after BorrowingHistory and BookCopy have already been written inside the transaction).
3. Call `POST /api/borrow/return`.
4. Assert:
   - Response is a failure (status >= 400)
   - `BorrowingHistory` is still `Active` (not `Returned`) ← proves the 1st write was rolled back
   - `BookCopy` is still `borrowed` (not `available`) ← proves the 2nd write was rolled back
   - No `Fine` was created ← proves the 4th step was also rolled back

**Why does this test matter?** Without MongoDB transactions (the pre-Phase-1.5 code), a crash after step 1 would permanently mark the borrowing as `Returned` while the copy remained `borrowed` — an inconsistent state with no recovery path. The transaction guarantees all-or-nothing.

---

### `fines.test.js` — Fine Calculation Unit Tests (5 tests)

**Purpose:** Verify the `calculateOverdueFine` function in `src/utils/fineCalculator.js` for all edge cases. These are pure unit tests with no database or HTTP involved.

| Test case | Input | Expected |
|---|---|---|
| On time | returned = due | 0 |
| Early return | returned < due | 0 |
| 1 second late | returned = due + 1s | 1 day's rate |
| Exactly 2 days late | returned = due + 2 days | 2 × rate |
| 2 days + 1 minute late | returned = due + 2d 1m | 3 × rate ← started day counts as full |

The critical edge case is the last one: "any started day counts as a full day." A borrower who returns a book at 12:01 AM the day after the due date owes for the full day, not just 1 minute. `Math.ceil` in `calculateOverdueFine` enforces this.

---

### `tenantGuard.test.js` — Tenant Guard Plugin Tests (81 tests)

**Purpose:** Prove that the `tenantGuard` Mongoose plugin (Phase 2) is correctly applied to every guarded model, and that it correctly blocks, allows, and opts out queries as specified.

**Why 81 tests from 9 assertion types × 9 models?**
`describe.each(guardedModels)` runs the same 9 assertions against each of the 8 guarded models. Adding a new tenant-owned model but forgetting to register the plugin will immediately cause the "Every guarded model is flagged as guarded" test to fail.

| Assertion | What it proves |
|---|---|
| Model has `_isTenantGuarded = true` | Plugin was registered |
| Unscoped `find({})` is rejected | Guard is active in enforce mode |
| Unscoped `findById` is rejected | ID-only lookups are not exempt |
| `find({ adminId: null })` is rejected | Null is not a valid tenant |
| Unscoped `deleteMany` is rejected | Bulk operations are guarded |
| Scoped `find({ adminId })` is allowed | Normal queries work fine |
| `.crossTenant('reason')` is allowed | Opt-out with reason works |
| `.crossTenant()` / `.crossTenant('  ')` is rejected | Empty/falsy reason is not accepted |
| Unscoped `aggregate` is rejected | Aggregation pipeline is also guarded |
| Scoped `aggregate` is allowed | Aggregations with `$match: { adminId }` work |

---

## CI Workflow — `.github/workflows/backend-tests.yml`

**What it does:** On every `git push` or pull request to `main`, `master`, or `dev`, GitHub Actions:
1. Checks out the repository
2. Installs Node.js 20
3. Runs `npm ci` (clean install from `package-lock.json`)
4. Runs `npm test`

**Why no MongoDB service in the workflow?**
`mongodb-memory-server` downloads and runs a real MongoDB binary automatically as part of the test run. There is nothing to configure in CI.

**Why `npm ci` instead of `npm install`?**
`npm ci` installs exactly what is in `package-lock.json` and fails if there is a mismatch. This makes CI reproducible — the same versions run locally and in CI.

---

## Bugs Found While Writing Tests

Writing tests is the best way to find real bugs. Two were discovered:

### Bug 1: Unscoped `Member.findOne` in `requireSelfOrStaff`

**File:** `src/middlewares/auth.middleware.js`

```js
// Before (bug):
const member = await Member.findOne({ userId: req.user.id });

// After (fix):
const member = await Member.findOne({ userId: req.user.id, adminId: req.user.adminId });
```

**Impact:** In enforce mode, the unscoped query threw a 500 error for any member accessing their own resources (request book, cancel request, view borrowings). This was a real production bug — it would have caused 500 errors in production once the guard was switched to enforce mode there too.

### Bug 2: Using `document.save()` in tests to update copy status

**Not a production bug** — only in test code. Calling `bookCopy.status = 'reserved'; bookCopy.save()` does not produce a query with a top-level `adminId` filter, which the guard rejects in enforce mode. The correct pattern (both in tests and production) is:

```js
await BookCopy.updateOne(
  { _id: copy._id, adminId },
  { $set: { status: 'reserved' } }
);
```

---

## Summary

| Metric | Value |
|---|---|
| Test files | 5 |
| Total tests | 95 |
| Test runtime | ~11 seconds |
| CI trigger | Every push and PR to main/dev |
| MongoDB | In-memory replica set (no external dependency) |
| Guard mode in tests | `enforce` (strictest) |
| Production bugs found | 1 (`requireSelfOrStaff` unscoped lookup) |

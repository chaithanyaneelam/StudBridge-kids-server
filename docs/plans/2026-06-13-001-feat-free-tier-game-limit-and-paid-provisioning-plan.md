---
date: 2026-06-13
type: feat
status: active
topic: free-tier-game-limit-and-paid-provisioning
origin: docs/brainstorms/free-tier-daily-game-limit-requirements.md
---

# feat: Free-Tier Daily Game Limit + Paid Provisioning Correctness

## Summary

Enforce a one-game-play-per-day limit for free-tier students on the backend (all games stay visible; play is blocked server-side after the day's single play), and expose a status the frontend reads to render locks. Alongside, make paid provisioning correct and consistent: a successful payment writes a `'paid'` status + expiry to `users` and proper start/end dates to `subscriptions`, and admin bulk-uploaded students are provisioned with both a `users` paid status and a real `subscriptions` row (plan `'yearly'`, 12-month term).

This plan builds on the requirements doc (see origin: `docs/brainstorms/free-tier-daily-game-limit-requirements.md`) and adds the payment-correctness and admin-subscription concerns raised during planning.

---

## Problem Frame

Today every authenticated student can open any game (topic) unlimited times: `POST /api/progress/topic-open` calls `recordTopicOpen` → `upsertTopicProgress`, which increments `topic_progress.play_count` with no plan check. `users` already carries `plan` / `plan_expiry`, and a `subscriptions` table exists, but free and paid students have identical access, so there is no incentive to subscribe.

Two adjacent data-correctness gaps affect the same access model:
1. On successful payment, `activateSubscription` writes the *tier name* (`monthly`/`6month`/`yearly`) into `users.plan` and updates `subscriptions` and `users` in two separate, non-transactional statements. There is no single canonical "is this user paid" signal, and a partial failure can leave `subscriptions` updated but `users` not.
2. Admin bulk upload (`bulkCreateStudents`) creates `users` rows with no `plan`/`plan_expiry` and no `subscriptions` record, so school-sponsored students would be treated as free and hit the daily limit.

The enforcement also cannot trust the JWT: the token (30-day expiry) carries a `plan` claim captured at login, so a student who pays mid-token would still look free. Free status must be read fresh from the database at play time.

---

## Actors

- A1. Free-tier student: no active paid plan (`users.plan` empty/`'free'`, or `plan_expiry` in the past). Subject to one play per calendar day.
- A2. Paid student: `users.plan = 'paid'` with `plan_expiry` today or later. Unlimited play.
- A3. School admin: bulk-uploads students via the admin portal; those students must be provisioned as paid with a subscription record.

---

## Requirements Traceability

Carried from origin (`docs/brainstorms/free-tier-daily-game-limit-requirements.md`):

- Free-tier identification and fallback: R1, R2, R3
- Daily play limit + reset: R4, R5, R6, R7, R8
- Backend enforcement + catalog stays visible + status surfaced: R9, R10, R11
- Locked experience (frontend): R12 — **out of scope here** (frontend repo); backend provides the status it needs (R11)
- Admin bulk upload provisioned as paid: R13, R14
- Acceptance examples: AE1–AE7

Added during planning (this plan):
- P1. A successful payment sets `users.plan = 'paid'`, `users.plan_expiry` = term end, and writes `subscriptions.start_date` / `subscriptions.expiry_date` correctly, atomically.
- P2. Admin bulk-uploaded students get a `subscriptions` row with plan `'yearly'`, start = today, end = today + 12 months, in addition to the `users` paid status.

---

## Key Technical Decisions

- **`users.plan = 'paid'` is the canonical access flag; the specific tier lives in `subscriptions.plan`.** A purchase or admin upload sets `users.plan='paid'` + `plan_expiry`; `subscriptions.plan` keeps the tier (`monthly`/`6month`/`yearly`). This replaces today's behavior of writing the tier name into `users.plan`. Rationale: one unambiguous "paid vs free" signal for the daily-limit gate; tier detail is still preserved where it belongs. (Confirmed with user.)
- **Free vs paid is computed in SQL against `CURRENT_DATE`.** `is_paid = plan IS NOT NULL AND plan <> '' AND plan <> 'free' AND plan_expiry IS NOT NULL AND plan_expiry >= CURRENT_DATE`. Rationale: keeps the paid/expiry boundary on the same server-date clock as the daily reset, avoiding JS/DB timezone drift.
- **Enforcement reads plan/expiry fresh from the DB, never from the JWT.** Rationale: the JWT `plan` claim is stale for up to 30 days after a purchase.
- **"Played today" = any `topic_progress` row for the user with `last_played = CURRENT_DATE`.** Checked *before* the upsert. Rationale: reuses the existing per-day `last_played` column; after the first play the row's `last_played` is today, so all subsequent opens (including the same topic) are blocked — matching R6.
- **Daily reset boundary = server calendar day (`CURRENT_DATE`).** Matches existing progress logic. (IST-specific boundary deferred — see Deferred Questions.)
- **Bulk provisioning and payment activation are made transactional.** Bulk: insert users + subscriptions in one transaction. Payment: update subscriptions + users in one transaction. Rationale: avoid half-provisioned states.

---

## High-Level Technical Design

Daily-limit decision at `topic-open` (illustrates intended approach; directional guidance for review, not implementation specification):

```text
topic-open(user_id, topic_id):
  access = getAccessInfo(user_id)          # SQL: is_paid (plan/expiry vs CURRENT_DATE)
  if access.is_paid:
      upsertTopicProgress()                # unlimited
  else:                                    # free tier
      if hasPlayedToday(user_id):          # SQL: EXISTS row WHERE last_played = CURRENT_DATE
          reject 403 LIMIT_REACHED { resets_at: next server day }
      else:
          upsertTopicProgress()            # consumes today's single play
```

Access-model data flow:

```text
users.plan = 'paid' | NULL | 'free'        <- canonical access flag (+ plan_expiry = term end)
subscriptions.plan = 'monthly'|'6month'|'yearly'  <- specific tier + start_date/expiry_date
free-check ignores tier; only reads users.plan + users.plan_expiry
```

---

## Implementation Units

### U1. Subscription/plan access helper

**Goal:** Single source of truth for "is this user paid vs free" and for shaping play-access status, plus the supporting read query.

**Requirements:** R1, R2, R3, R8

**Dependencies:** none

**Files:**
- `src/repositories/user.repository.js` (modify) — add `getAccessInfo(user_id)` returning `{ plan, plan_expiry, is_paid }` where `is_paid` is computed in SQL against `CURRENT_DATE`.
- `src/utils/planAccess.js` (create) — pure helpers: `buildPlayAccessStatus({ is_paid, hasPlayedToday })` → `{ is_free, locked, plays_remaining, plays_used_today, resets_at }`; `nextResetAt()` (start of next server calendar day, ISO string).
- `src/utils/planAccess.test.js` (create) — unit tests for the pure helpers.

**Approach:**
- `getAccessInfo` SQL: `SELECT plan, plan_expiry, (plan IS NOT NULL AND plan <> '' AND plan <> 'free' AND plan_expiry IS NOT NULL AND plan_expiry >= CURRENT_DATE) AS is_paid FROM users WHERE id = $1`.
- `buildPlayAccessStatus`: paid → `{ is_free:false, locked:false, plays_remaining:null }`; free → `locked = hasPlayedToday`, `plays_remaining = hasPlayedToday ? 0 : 1`, `plays_used_today = hasPlayedToday ? 1 : 0`, `resets_at = nextResetAt()`.
- Keep all date-boundary truth in SQL (`CURRENT_DATE`); `nextResetAt()` is presentation-only for the frontend countdown.

**Patterns to follow:** existing repository query style in `src/repositories/user.repository.js` (parameterized `pool.query`, returns `rows[0]`).

**Test scenarios:**
- `buildPlayAccessStatus`: paid user → `is_free=false`, `locked=false`, `plays_remaining=null`.
- Free user who has not played today → `locked=false`, `plays_remaining=1`, `plays_used_today=0`, `resets_at` present.
- Free user who has played today → `locked=true`, `plays_remaining=0`, `plays_used_today=1`.
- `nextResetAt` returns the start of the next calendar day after "now" and is always in the future.

**Verification:** Helper unit tests pass; `getAccessInfo` returns `is_paid=true` only for a non-empty, non-`'free'` plan with a future/today `plan_expiry`.

---

### U2. Enforce daily play limit at topic-open

**Goal:** Block a free-tier student's second game open within a server calendar day; allow the first; never restrict paid students.

**Requirements:** R4, R5, R6, R7, R8, R9; AE1, AE3, AE4, AE5

**Dependencies:** U1

**Files:**
- `src/repositories/progress.repository.js` (modify) — add `hasPlayedToday(user_id)` → `SELECT EXISTS(SELECT 1 FROM topic_progress WHERE user_id = $1 AND last_played = CURRENT_DATE) AS played`.
- `src/services/progress.service.js` (modify) — in `recordTopicOpen`, fetch `getAccessInfo`; if not paid and `hasPlayedToday`, throw a `403` error (`code: "PLAY_LIMIT_REACHED"`, message + `resets_at`); otherwise proceed to `upsertTopicProgress`.
- `src/controllers/progress.controller.js` (modify, if needed) — ensure the thrown limit error surfaces as HTTP 403 with a JSON body the frontend can read (`error`, `code`, `resets_at`). Confirm `errorHandler` passes through `status`/`statusCode`.
- `src/middleware/errorHandler.js` (review only) — confirm it honors `err.status`/`err.statusCode` and serializes a `code` field.
- `src/services/progress.service.test.js` (create) — service-level tests with mocked repositories.

**Approach:**
- Order matters: check the limit **before** `upsertTopicProgress` so the first play is recorded and counts as the day's single play.
- Limit error shape: `{ status: 403, code: "PLAY_LIMIT_REACHED", message, resets_at }`.
- Do not read `plan` from `req.user` (JWT) — always use `getAccessInfo` (DB).
- `practiceCompleted` (`/practice-done`) is **not** gated — it records the result of the already-allowed play.

**Patterns to follow:** existing service error pattern in `src/services/quiz.service.js` (`const error = new Error(...); error.status = 4xx; throw error;`); existing `next(error)` flow in `src/controllers/progress.controller.js`.

**Test scenarios:**
- Covers AE1. Free user, no play today → first `topic-open` succeeds and records; immediately a second `topic-open` (different topic) → 403 `PLAY_LIMIT_REACHED`.
- Covers AE1/R6. Free user who already played today re-opens the *same* topic → 403 (the played game also locks).
- Covers AE4/R8. Paid user opens 3 different topics in one day → all succeed.
- Covers AE3/R7. Free user whose only `topic_progress.last_played` is yesterday → `topic-open` today succeeds.
- Covers AE5/R3. User with `plan='paid'` but `plan_expiry` in the past, second open same day → 403 (treated as free).
- Error path: limit error returns HTTP 403 with `code` and `resets_at` in the body (not a generic 500).
- Happy path: successful open still returns the existing `{ message, data }` shape unchanged.

**Verification:** A free account can play exactly one game per day and is blocked on the second attempt with a 403; a paid account is never blocked; blocking cannot be bypassed by calling the endpoint directly.

---

### U3. Play-access status endpoint

**Goal:** Give the frontend a single call to know whether the student is free, whether games are currently locked, and when access resets — so it can show all games with lock overlays (R10/R11/R12 support).

**Requirements:** R10, R11; supports R12; AE2, AE6

**Dependencies:** U1

**Files:**
- `src/controllers/progress.controller.js` (modify) — add `getPlayAccess` handler: read `getAccessInfo` + `hasPlayedToday`, return `buildPlayAccessStatus(...)`.
- `src/routes/progress.routes.js` (modify) — add `GET /play-access` (auth + `apiLimiter`).
- `src/services/progress.service.js` (modify) — add `getPlayAccess(user_id)` orchestrating repo calls + helper.

**Approach:**
- Response: `{ data: { is_free, locked, plays_remaining, plays_used_today, resets_at } }`.
- Catalog endpoints (`getSyllabus`) are intentionally unchanged — all games keep being returned (R10). Lock state lives in this status, not in the catalog.

**Patterns to follow:** existing `getMyProgress` controller/route wiring in `src/controllers/progress.controller.js` and `src/routes/progress.routes.js`.

**Test scenarios:**
- Covers AE6/R10. Free + locked → endpoint returns `is_free=true, locked=true`; catalog/syllabus still returns the full game list (no games hidden).
- Covers AE2. Free user who used today's play → `locked=true`, `plays_remaining=0`, `resets_at` in the future.
- Free user with a play available → `locked=false`, `plays_remaining=1`.
- Paid user → `is_free=false`, `locked=false`.

**Verification:** Frontend can render lock state purely from this endpoint without guessing; a locked free user still receives the complete catalog from the syllabus endpoint.

---

### U4. Make payment activation correct and atomic

**Goal:** On a confirmed payment, set the canonical paid status on `users` and correct dates on `subscriptions`, in one transaction, idempotently.

**Requirements:** P1; R2 (paid identification consistency)

**Dependencies:** U1 (shares the `users.plan='paid'` convention)

**Files:**
- `src/repositories/payment.repository.js` (modify) — `activateSubscription`: wrap the `subscriptions` update and `users` update in a single transaction (`pool.connect()` → `BEGIN`/`COMMIT`/`ROLLBACK`); set `users.plan = 'paid'` (was the tier), `users.plan_expiry = CURRENT_DATE + term`; keep `subscriptions.plan` = tier, `start_date = CURRENT_DATE`, `expiry_date = CURRENT_DATE + term`.
- `src/repositories/payment.repository.test.js` (create) — tests around term/date computation and the `'paid'` write (mocked client).

**Approach:**
- Keep the existing term mapping (`monthly`→1, `6month`→6, `yearly`→12 months) computed in code; continue interpolating only that integer into the `INTERVAL`.
- Idempotency is preserved by the existing guard: `activateSubscription` rewrites `subscriptions.razorpay_id` from the merchant txn id to the PhonePe txn id, so `findByMerchantTransactionId(merchant_id)` returns null on replay and `verifyPayment`/`handleCallback` skip re-activation. Do not change that contract.
- Return shape stays `{ subscription, user }` so callers are unaffected.

**Patterns to follow:** existing query/structure in `src/repositories/payment.repository.js`; the existing idempotency checks in `verifyPayment` / `handleCallback` in `src/services/payment.service.js`.

**Test scenarios:**
- Covers P1. `monthly` activation → `users.plan='paid'`, `users.plan_expiry = today + 1 month`; `subscriptions.start_date = today`, `expiry_date = today + 1 month`, `subscriptions.plan='monthly'`.
- `6month` and `yearly` compute +6 and +12 month expiries respectively.
- Idempotency: calling activation twice for the same merchant txn id activates once; the replay is a no-op (no double expiry extension).
- Failure path: if the `users` update fails, the `subscriptions` update is rolled back (no half-applied state).
- Regression: `getUserSubscription` / `getMySubscription` still return the latest subscription with the tier intact.

**Verification:** After a real/sandbox successful payment, `users.plan='paid'` with the correct `plan_expiry`, and `subscriptions` has matching `start_date`/`expiry_date` and the purchased tier; re-running status check does not extend the expiry again.

---

### U5. Provision admin bulk-uploaded students as paid (users + yearly subscription)

**Goal:** Bulk-created school students are paid for 12 months: `users.plan='paid'` + `plan_expiry`, plus a `subscriptions` row with plan `'yearly'` and a 12-month term — all atomic.

**Requirements:** R13, R14, P2; AE7

**Dependencies:** U1 (paid convention)

**Files:**
- `src/repositories/admin.repository.js` (modify) — `bulkCreateStudents`: (a) include `plan = 'paid'` and `plan_expiry = CURRENT_DATE + INTERVAL '12 months'` in the `users` insert and `RETURNING id`; (b) return the created ids (not just count); (c) wrap the users insert + a multi-row `subscriptions` insert in a single transaction via `pool.connect()`.
- `src/services/admin.service.js` (modify) — `bulkCreateStudents`: keep returning `{ count, message, defaultPassword, note }`; derive `count` from returned ids; pass through to the transactional repository call.
- `src/repositories/admin.repository.test.js` (create) — tests for the provisioning shape and rollback.

**Approach:**
- Subscriptions row per student: `plan='yearly'`, `amount=0` (school-sponsored), `start_date=CURRENT_DATE`, `expiry_date=CURRENT_DATE + INTERVAL '12 months'`, `razorpay_id = 'ADMIN_' || school_id || '_' || school_reg_number || '_' || <timestamp>` to keep it non-null, unique, and traceable to an admin grant.
- Transaction: `BEGIN` → bulk insert users `RETURNING id` → build and run the multi-row subscriptions insert with those ids → `COMMIT`; `ROLLBACK` on any error. This also hardens today's non-transactional single insert.
- Preserve existing error mapping (`23505` duplicate roll number → 409, `23503` bad FK → 400).
- `users.plan_expiry` and the subscription `expiry_date` both use `CURRENT_DATE + INTERVAL '12 months'` so they agree.

**Patterns to follow:** existing multi-row insert builder in `src/repositories/admin.repository.js` (`placeholders`/`values` construction); existing error-code handling in `src/services/admin.service.js`.

**Test scenarios:**
- Covers AE7/R13. Bulk upload of N students → N `users` rows with `plan='paid'` and `plan_expiry = today + 12 months`, and N `subscriptions` rows with `plan='yearly'`, `start_date=today`, `expiry_date=today + 12 months`.
- Covers R14. A bulk student's `plan_expiry` is 12 months out (not unlimited) — after that date the free-tier fallback (U1/U2) applies.
- Integration: a freshly bulk-created student calling `topic-open` multiple times in one day is never blocked (paid) — proves U5 + U2 interplay.
- Failure path: if the subscriptions insert fails, the users insert is rolled back (no students created without a subscription).
- Duplicate roll number still yields 409; invalid `school_id`/`class_id`/`board_id` still yields 400.

**Verification:** After a bulk upload, every created student is `plan='paid'` with a 12-month expiry and has a matching `yearly` subscription row; a partial failure creates no rows; bulk students are not subject to the daily limit.

---

## System-Wide Impact

- **Access model:** `users.plan` semantics change from "tier name" to "`'paid'` status flag." Any other reader of `users.plan` should treat non-empty/non-`'free'` + valid expiry as paid (the free-check already does). The JWT still carries a `plan` claim but it is no longer authoritative for gating — enforcement reads the DB.
- **Play flow:** `POST /api/progress/topic-open` can now return `403 PLAY_LIMIT_REACHED` for free users; the frontend must handle this and use `GET /api/progress/play-access` for lock rendering.
- **Catalog:** unchanged — syllabus/games endpoints keep returning all games.
- **Payments & admin:** activation and bulk upload become transactional; return contracts are preserved.

---

## Scope Boundaries

- Free-tier identification reuses existing `users.plan` / `plan_expiry`; no new plan-pricing tiers introduced.
- Catalog/syllabus responses are not modified to carry lock state — lock state is a separate status endpoint.
- The daily limit gates game opens (`topic-open`), not `practice-done` result recording.

### Deferred to Follow-Up Work

- Frontend lock UI + upgrade prompt (R12) — lives in the frontend repo; this plan only provides the backing status.
- A self-serve in-app upgrade/checkout surface launched from the lock screen.
- Admin UI to set a custom per-upload subscription end date (the 12-month term is applied automatically).
- Backfilling existing already-uploaded students (created before this change) with paid status / subscriptions — separate one-off task if needed.

---

## Dependencies / Assumptions

- **No automated test runner is configured** (`package.json` `test` is a placeholder; no jest/mocha). Test scenarios above are enumerated for an implementer; running them requires adding a test runner (e.g., jest) as a small prerequisite, or verifying manually via API calls against a dev DB. Flagged rather than assumed resolved.
- Schema is managed in Supabase (no in-repo migrations). Assumes `users.plan` (text) and `users.plan_expiry` (date) and `subscriptions(user_id, plan, amount, razorpay_id, start_date, expiry_date)` already exist (confirmed via existing queries). `subscriptions.amount` is assumed to accept `0`; `razorpay_id` is assumed nullable/text and is set to a synthetic admin value for bulk grants.
- `topic_progress` has `(user_id, topic_id)` unique constraint and a `last_played` date column (confirmed via existing upsert).
- Day boundary for both the daily reset and the paid-expiry comparison is the database server's `CURRENT_DATE`.
- Self-registered (non-bulk) students remain free by default and are correctly subject to the limit.

---

## Outstanding Questions

### Deferred to Implementation

- [Affects U2/U3] Exact JSON error/status body shape the frontend wants for `PLAY_LIMIT_REACHED` (fields, message copy) — confirm with frontend during integration.
- [Affects U4/U5] Confirm `subscriptions.amount` accepts `0` and `razorpay_id` accepts the synthetic admin string against the live schema; adjust to `null` if a NOT NULL/format constraint exists.

### Deferred to Planning / Product (non-blocking)

- [Affects R7] Whether the reset boundary must be IST rather than server date. Current decision: server `CURRENT_DATE`. Revisit only if product requires a fixed timezone.
- [Affects R5] Whether a play should count when the game iframe fails to load (currently it counts at open). Revisit if it harms free-user experience.

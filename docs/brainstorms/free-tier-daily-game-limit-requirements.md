---
date: 2026-06-13
topic: free-tier-daily-game-limit
---

# Free-Tier Daily Game Play Limit

## Summary

Free-tier students get exactly one game play per calendar day across the entire catalog. After their first play of the day, every game locks — including the one they just played — until the next day resets the allowance. All games stay visible (displayed but locked). Students bulk-uploaded by school admins are created as paid so they are never limited.

---

## Problem Frame

Today every student can open and play any game (topic) an unlimited number of times. Each game open is recorded via the progress flow (`recordTopicOpen` → `topic_progress.play_count`), but nothing gates how many games a student can play. Users already carry a `plan` / `plan_expiry`, and paid subscriptions exist (monthly / 6month / yearly), yet free and paid students currently have identical access.

This removes the incentive to subscribe and gives away the full catalog for free. At the same time, schools that pay for access in bulk must not be caught by any free-tier restriction — their students are paid users by virtue of the school's purchase, and being throttled would break the school relationship.

---

## Actors

- A1. Free-tier student: a student with no active paid plan (no plan, or an expired plan). Subject to the one-play-per-day limit.
- A2. Paid student: a student with a currently-valid paid plan (`monthly` / `6month` / `yearly` / `paid`). Unlimited play.
- A3. School admin: uploads students in bulk via the admin portal; those students must be created as paid.

---

## Requirements

**Free-tier identification**
- R1. A user is "free tier" when they have no active paid plan: `plan` is empty/null OR `plan_expiry` is in the past (before today).
- R2. A user is "paid" (unlimited) when they have a recognized plan value (`monthly`, `6month`, `yearly`, or `paid`) AND `plan_expiry` is today or later.
- R3. When a paid user's `plan_expiry` passes, they automatically fall back to free-tier behavior (the daily limit applies again) without any separate downgrade step.

**Daily play limit**
- R4. A free-tier student may trigger one game play per calendar day across the whole catalog (not per game).
- R5. The "play" that consumes the daily allowance is the act of opening/starting a game (the action that records topic progress today).
- R6. Once a free-tier student has used today's play, all games are locked for them for the rest of the day — including the game they just played.
- R7. The allowance resets at the start of each new calendar day (one fresh play per day).
- R8. Paid students (R2) are never subject to the limit; play is always allowed.

**Enforcement and surfacing**
- R9. The backend enforces the limit on the play/open action: when a free-tier student who has already played today attempts to open any game, the backend rejects it (the catalog being visible on the frontend must not allow bypassing the limit).
- R10. The full catalog of games continues to be returned/displayed regardless of lock state — restricting access must not hide games.
- R11. The backend exposes the student's current play status so the frontend can render lock state without guessing: at minimum whether the student is limited, whether today's play has been used / games are currently locked, and when the allowance resets.

**Locked experience**
- R12. When a free-tier student has used today's play and taps any game, the frontend shows the games as locked (lock icon/overlay) and prompts them to upgrade to a paid plan, with messaging that one free game resets the next day.

**Admin bulk upload**
- R13. Students created through the admin bulk-upload flow are created with `plan = 'paid'` and `plan_expiry = upload date + 12 months`, so they are unlimited for the school subscription year and are not subject to the free-tier limit.
- R14. After the 12-month expiry, bulk-uploaded students follow the same fallback as R3 (revert to free-tier limit) unless renewed.

---

## Acceptance Examples

- AE1. Covers R4, R5, R6. Given a free-tier student who has not played today, when they open their first game, the play is allowed and recorded; when they then try to open any second game (or re-open the first), it is blocked.
- AE2. Covers R6, R12. Given a free-tier student who already played today, when they tap any game in the catalog, all games show as locked with an upgrade prompt and a "resets tomorrow" message.
- AE3. Covers R7. Given a free-tier student who was locked yesterday, when a new calendar day begins, they again have one available play.
- AE4. Covers R8, R2. Given a student with a valid paid plan, when they open multiple games in one day, every play is allowed.
- AE5. Covers R3, R14. Given a student whose `plan_expiry` is now in the past, when they try to play a second game in a day, it is blocked exactly like a free-tier student.
- AE6. Covers R10. Given a free-tier student who is locked for the day, when the catalog loads, all games are still listed (none hidden) — only their playability is restricted.
- AE7. Covers R13. Given a school admin bulk-uploads a class of students, when those students log in, their plan is `paid` with expiry 12 months out and they can play without any daily limit.

---

## Success Criteria

- Free-tier students can play exactly one game per day and clearly understand why further games are locked and how to unlock more (upgrade or wait until tomorrow).
- The limit cannot be bypassed from the frontend — a free student cannot play a second game in a day even by manipulating client behavior, because the backend enforces it.
- Bulk-uploaded school students never hit the limit during their subscription year, with zero manual per-student plan edits by the admin.
- Planning can implement enforcement, status surfacing, and the bulk-upload change without having to re-decide who counts as free, what consumes the daily allowance, or how schools are marked paid.

---

## Scope Boundaries

- Multiple free plays per day, tiered free allowances, or per-game (rather than per-day) limits — not in scope; the rule is exactly one play per day.
- Letting a free student re-play their one chosen game repeatedly — explicitly excluded; the played game also locks (R6).
- Changes to the paid subscription purchase/payment flow itself (PhonePe checkout, plan pricing) — unchanged.
- A self-serve in-app upgrade/checkout built specifically for this lock screen — the prompt drives toward existing upgrade paths; no new payment surface is being designed here.
- Admin UI to set/override a specific school subscription end date per upload — out of scope; the 12-month expiry is applied automatically (a per-upload custom date can be revisited later).
- Limits for teacher/admin roles — only students play games; this feature targets student play.

---

## Key Decisions

- One play *event* per day, not one replayable game: Matches the requested behavior where even the previously played game locks after the first play. Simpler mental model and stronger upgrade incentive.
- Free = no active paid plan (null/empty plan OR expired `plan_expiry`): Reuses the existing `plan` / `plan_expiry` fields, so expired paid users naturally fall back to the free limit with no extra state.
- Bulk students set to `plan = 'paid'`, `plan_expiry = upload + 12 months`: Treats a school upload as a one-year sponsored subscription; auto-reverts after a year for clean renewal semantics.
- Backend is the source of truth for enforcement; frontend renders lock state from a status the backend exposes: Visible catalog (R10) means the limit must be enforced server-side to prevent bypass, while the frontend still needs status to render locks/upgrade prompts.

---

## Dependencies / Assumptions

- Assumes the daily boundary is the server's calendar day, consistent with the existing `CURRENT_DATE` usage in progress tracking. If a specific timezone (e.g., IST) is required for the reset, it must be decided in planning.
- Assumes the existing topic-open/progress action is the single point where a play is initiated and can serve as the enforcement gate.
- Assumes `plan` accepting the value `'paid'` (alongside `monthly` / `6month` / `yearly`) is acceptable; no new plan pricing is introduced.
- Assumes self-registered students (non-bulk) remain free-tier by default and are correctly subject to the limit.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R7][Technical] Exact timezone/day-boundary for the daily reset (server time vs IST) and how "has played today" is computed from existing play records.
- [Affects R9, R11][Technical] Which endpoint(s) carry enforcement and how play status is shaped/returned for the frontend (e.g., included in the catalog/syllabus response vs a dedicated status field).
- [Affects R5][Technical] Whether a play is counted at game open even if the game/iframe fails to load, and whether any retry within a short window should re-consume the allowance.

const test = require("node:test");
const assert = require("node:assert");
const { nextResetAt, buildPlayAccessStatus } = require("./planAccess");

test("buildPlayAccessStatus: paid user is never locked", () => {
  const status = buildPlayAccessStatus({ is_paid: true, has_played_today: true });
  assert.strictEqual(status.is_free, false);
  assert.strictEqual(status.locked, false);
  assert.strictEqual(status.plays_remaining, null);
});

test("buildPlayAccessStatus: free user with no play today has one play available", () => {
  const status = buildPlayAccessStatus({
    is_paid: false,
    has_played_today: false,
  });
  assert.strictEqual(status.is_free, true);
  assert.strictEqual(status.locked, false);
  assert.strictEqual(status.plays_remaining, 1);
  assert.strictEqual(status.plays_used_today, 0);
  assert.ok(status.resets_at, "resets_at should be present for free users");
});

test("buildPlayAccessStatus: free user who played today is locked", () => {
  const status = buildPlayAccessStatus({
    is_paid: false,
    has_played_today: true,
  });
  assert.strictEqual(status.is_free, true);
  assert.strictEqual(status.locked, true);
  assert.strictEqual(status.plays_remaining, 0);
  assert.strictEqual(status.plays_used_today, 1);
});

test("nextResetAt: returns start of the next calendar day, always in the future", () => {
  const now = new Date("2026-06-13T15:30:00");
  const reset = new Date(nextResetAt(now));
  assert.ok(reset.getTime() > now.getTime(), "reset must be in the future");
  assert.strictEqual(reset.getHours(), 0);
  assert.strictEqual(reset.getMinutes(), 0);
  assert.strictEqual(reset.getDate(), 14);
});

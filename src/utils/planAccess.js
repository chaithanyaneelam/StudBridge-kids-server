/**
 * Plan access helpers
 *
 * Pure functions that shape the play-access status the frontend reads to render
 * lock state. The authoritative "paid vs free" and "played today" truths are
 * computed in SQL against CURRENT_DATE (see user.repository.getAccessInfo and
 * progress.repository.hasPlayedToday). These helpers only assemble the response
 * and compute the next reset moment for a client-side countdown.
 */

/**
 * Start of the next server calendar day, as an ISO string.
 * Used purely for the frontend "resets at" countdown — the daily limit itself
 * is enforced against the database's CURRENT_DATE, not this value.
 * @param {Date} [now] - reference time (defaults to now)
 * @returns {string} ISO timestamp of the next local midnight
 */
const nextResetAt = (now = new Date()) => {
  const next = new Date(now);
  // setHours(24, ...) rolls over to 00:00 of the following day
  next.setHours(24, 0, 0, 0);
  return next.toISOString();
};

/**
 * Build the play-access status object for a student.
 * @param {Object} params
 * @param {boolean} params.is_paid - whether the user currently has an active paid plan
 * @param {boolean} params.has_played_today - whether the free user already played today
 * @returns {Object} { is_free, locked, plays_remaining, plays_used_today, resets_at }
 */
const buildPlayAccessStatus = ({ is_paid, has_played_today }) => {
  if (is_paid) {
    return {
      is_free: false,
      locked: false,
      plays_remaining: null,
      plays_used_today: null,
      resets_at: null,
    };
  }

  const played = Boolean(has_played_today);
  return {
    is_free: true,
    locked: played,
    plays_remaining: played ? 0 : 1,
    plays_used_today: played ? 1 : 0,
    resets_at: nextResetAt(),
  };
};

module.exports = {
  nextResetAt,
  buildPlayAccessStatus,
};

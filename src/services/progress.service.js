const progressRepository = require("../repositories/progress.repository");
const userRepository = require("../repositories/user.repository");
const { buildPlayAccessStatus, nextResetAt } = require("../utils/planAccess");

/**
 * Whether the daily play limit applies to this user.
 * Only students with no active paid plan are limited; non-student roles
 * (teacher/admin) and paid students are unlimited. Plan status is read fresh
 * from the database (not the JWT, whose plan claim can be stale for up to
 * 30 days after a purchase).
 * @param {number} user_id - User ID
 * @param {string} role - User role from the authenticated request
 * @returns {Promise<boolean>} true if the one-play-per-day limit applies
 */
const isLimitedUser = async (user_id, role) => {
  if (role !== "student") return false;
  const access = await userRepository.getAccessInfo(user_id);
  const isPaid = Boolean(access && access.is_paid);
  return !isPaid;
};

/**
 * Record when student opens a topic (taps on topic div).
 * Increments play_count in topic_progress table.
 *
 * Free-tier students may open one game per server calendar day. The limit check
 * and the play recording happen atomically (advisory-locked transaction) so the
 * first open of the day is recorded and counts as that day's single play, and
 * concurrent opens cannot both slip through. Paid students and non-student roles
 * are never limited.
 * @param {number} user_id - User ID
 * @param {number} topic_id - Topic ID
 * @param {string} role - User role from the authenticated request
 * @returns {Promise<Object>} Updated progress record
 */
const recordTopicOpen = async (user_id, topic_id, role) => {
  const limited = await isLimitedUser(user_id, role);

  if (!limited) {
    return progressRepository.upsertTopicProgress(user_id, topic_id);
  }

  const result = await progressRepository.openTopicWithDailyLimit(
    user_id,
    topic_id,
  );

  if (result.limited) {
    const error = new Error(
      "You've used your free game for today. Upgrade to a paid plan to keep playing, or come back tomorrow for another free game.",
    );
    error.status = 403;
    error.code = "PLAY_LIMIT_REACHED";
    error.resets_at = nextResetAt();
    throw error;
  }

  return result.progress;
};

/**
 * Get the student's current play-access status for rendering lock state.
 * Paid students and non-student roles are unlimited; free students get one
 * play per server calendar day.
 * @param {number} user_id - User ID
 * @param {string} role - User role from the authenticated request
 * @returns {Promise<Object>} { is_free, locked, plays_remaining, plays_used_today, resets_at }
 */
const getPlayAccess = async (user_id, role) => {
  const limited = await isLimitedUser(user_id, role);

  if (!limited) {
    return buildPlayAccessStatus({ is_paid: true, has_played_today: false });
  }

  const hasPlayedToday = await progressRepository.hasPlayedToday(user_id);
  return buildPlayAccessStatus({
    is_paid: false,
    has_played_today: hasPlayedToday,
  });
};

/**
 * Record practice quiz results after game ends (via iframe postMessage)
 * Validates scores are non-negative integers, then saves to database
 * @param {number} user_id - User ID
 * @param {number} topic_id - Topic ID
 * @param {number} ans_correct - Number of correct answers
 * @param {number} ans_wrong - Number of wrong answers
 * @returns {Promise<Object>} Saved practice result
 */
const recordPracticeResult = async (
  user_id,
  topic_id,
  ans_correct,
  ans_wrong,
) => {
  // Validate scores are non-negative numbers
  if (!Number.isInteger(ans_correct) || ans_correct < 0) {
    const error = new Error("ans_correct must be a non-negative integer");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(ans_wrong) || ans_wrong < 0) {
    const error = new Error("ans_wrong must be a non-negative integer");
    error.statusCode = 400;
    throw error;
  }

  const result = await progressRepository.savePracticeResult(
    user_id,
    topic_id,
    ans_correct,
    ans_wrong,
  );
  return result;
};

/**
 * Get all progress records for a user
 * @param {number} user_id - User ID
 * @returns {Promise<Array>} Array of progress records with topic and chapter info
 */
const getUserProgress = async (user_id) => {
  const progress = await progressRepository.getProgressByUser(user_id);
  return progress;
};

module.exports = {
  recordTopicOpen,
  recordPracticeResult,
  getPlayAccess,
  getUserProgress,
};

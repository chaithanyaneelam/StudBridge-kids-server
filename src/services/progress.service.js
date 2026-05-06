const progressRepository = require("../repositories/progress.repository");

/**
 * Record when student opens a topic (taps on topic div)
 * Increments play_count in topic_progress table
 * @param {number} user_id - User ID
 * @param {number} topic_id - Topic ID
 * @returns {Promise<Object>} Updated progress record
 */
const recordTopicOpen = async (user_id, topic_id) => {
  const progress = await progressRepository.upsertTopicProgress(
    user_id,
    topic_id,
  );
  return progress;
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
  getUserProgress,
};

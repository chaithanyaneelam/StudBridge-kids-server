const leaderboardRepository = require("../repositories/leaderboard.repository");

/**
 * Get global leaderboard for a class
 * @param {number} class_id - Class ID
 * @returns {Promise<Array>} Top 50 students globally
 */
const getGlobalLeaderboard = async (class_id) => {
  const leaderboard =
    await leaderboardRepository.getGlobalLeaderboard(class_id);
  return leaderboard;
};

/**
 * Get school leaderboard for a class
 * @param {number} class_id - Class ID
 * @param {number} school_id - School ID
 * @returns {Promise<Array>} Top 50 students in school
 */
const getSchoolLeaderboard = async (class_id, school_id) => {
  const leaderboard = await leaderboardRepository.getSchoolLeaderboard(
    class_id,
    school_id,
  );
  return leaderboard;
};

/**
 * Get student's rank in both global and school leaderboards
 * @param {number} user_id - User ID
 * @param {number} class_id - Class ID
 * @param {number} school_id - School ID
 * @returns {Promise<Object>} Rank information
 */
const getMyRank = async (user_id, class_id, school_id) => {
  const rank = await leaderboardRepository.getStudentRank(
    user_id,
    class_id,
    school_id,
  );
  return rank;
};

module.exports = {
  getGlobalLeaderboard,
  getSchoolLeaderboard,
  getMyRank,
};

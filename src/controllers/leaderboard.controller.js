const pool = require("../config/db");
const leaderboardService = require("../services/leaderboard.service");

/**
 * Get global leaderboard for student's class
 * @param {Object} req - Express request with req.user from JWT
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const getGlobalLeaderboard = async (req, res, next) => {
  try {
    const class_id = req.user.class_id;

    const leaderboard = await leaderboardService.getGlobalLeaderboard(class_id);

    res.status(200).json({
      message: "Global leaderboard retrieved successfully",
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get school leaderboard for student's class and school
 * @param {Object} req - Express request with req.user from JWT
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const getSchoolLeaderboard = async (req, res, next) => {
  try {
    const class_id = req.user.class_id;
    const school_id = req.user.school_id;

    const leaderboard = await leaderboardService.getSchoolLeaderboard(
      class_id,
      school_id,
    );

    res.status(200).json({
      message: "School leaderboard retrieved successfully",
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student's own rank in global and school leaderboards
 * @param {Object} req - Express request with req.user from JWT
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const getMyRank = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const class_id = req.user.class_id;
    const school_id = req.user.school_id;

    const rank = await leaderboardService.getMyRank(
      user_id,
      class_id,
      school_id,
    );

    res.status(200).json({
      message: "Your rank retrieved successfully",
      data: rank,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get school leaderboard for teacher — fetches their class from assignment table
 * @param {Object} req - Express request with req.user from JWT
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const getTeacherSchoolLeaderboard = async (req, res, next) => {
  try {
    const teacher_id = req.user.id;
    const school_id = req.user.school_id;

    // Get teacher's assigned class from class_teacher_assignments
    const assignment = await pool.query(
      `SELECT class_id FROM class_teacher_assignments
       WHERE teacher_id = $1 LIMIT 1`,
      [teacher_id],
    );

    if (!assignment.rows[0]) {
      return res
        .status(200)
        .json({ data: [], message: "No class assigned to this teacher yet" });
    }

    const class_id = assignment.rows[0].class_id;
    const leaderboard = await leaderboardService.getSchoolLeaderboard(
      class_id,
      school_id,
    );
    res.status(200).json({ data: leaderboard });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGlobalLeaderboard,
  getSchoolLeaderboard,
  getMyRank,
  getTeacherSchoolLeaderboard,
};

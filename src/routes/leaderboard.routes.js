const express = require("express");
const authMiddleware = require("../middleware/auth");
const teacherOnly = require("../middleware/teacherOnly");
const { apiLimiter } = require("../middleware/rateLimiter");
const leaderboardController = require("../controllers/leaderboard.controller");

/**
 * Leaderboard Routes - All Protected with Auth
 * GET /global      ← student sees global leaderboard for their class
 * GET /school      ← student sees school leaderboard for their class and school
 * GET /my-rank     ← student sees their rank in both leaderboards
 */
const router = express.Router();

// Apply auth and rate limiting to all routes
router.use(authMiddleware);
router.use(apiLimiter);

// Leaderboard endpoints
router.get("/global", leaderboardController.getGlobalLeaderboard);
router.get("/school", leaderboardController.getSchoolLeaderboard);
router.get("/my-rank", leaderboardController.getMyRank);

// Teacher gets their class leaderboard
router.get(
  "/teacher-class",
  authMiddleware,
  teacherOnly,
  apiLimiter,
  leaderboardController.getTeacherSchoolLeaderboard,
);

module.exports = router;

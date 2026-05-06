const express = require("express");
const authMiddleware = require("../middleware/auth");
const { apiLimiter } = require("../middleware/rateLimiter");
const progressController = require("../controllers/progress.controller");

/**
 * Progress Routes - All Protected
 * POST /topic-open - Record when student opens a topic
 * POST /practice-done - Record practice quiz results (from iframe postMessage)
 * GET /my-progress - Fetch all progress for logged-in student
 */
const router = express.Router();

// All routes on this router require authentication
router.use(authMiddleware);

// Record topic open when student taps on topic div
router.post("/topic-open", apiLimiter, progressController.topicOpened);

// Record practice quiz results when game ends (via iframe postMessage)
router.post("/practice-done", apiLimiter, progressController.practiceCompleted);

// Get all progress for logged-in student
router.get("/my-progress", apiLimiter, progressController.getMyProgress);

module.exports = router;

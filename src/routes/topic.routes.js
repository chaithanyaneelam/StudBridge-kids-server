const express = require("express");
const authMiddleware = require("../middleware/auth");
const { apiLimiter } = require("../middleware/rateLimiter");
const topicController = require("../controllers/topic.controller");

/**
 * Topic Routes - All Protected
 * GET /syllabus - Fetch entire syllabus for logged-in student
 */
const router = express.Router();

// All routes on this router require authentication
router.use(authMiddleware);

// Get entire syllabus for student's class and board
router.get("/syllabus", apiLimiter, topicController.getSyllabus);

module.exports = router;

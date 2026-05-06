const express = require("express");
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const teacherOnly = require("../middleware/teacherOnly");
const { apiLimiter } = require("../middleware/rateLimiter");
const questionbankController = require("../controllers/questionbank.controller");

/**
 * Question Bank Routes - For Admin and Teacher
 * POST /add        ← admin or teacher adds question
 * GET /:topic_id   ← admin or teacher views questions for a topic
 * DELETE /:id      ← admin or teacher deletes a question
 */
const router = express.Router();

// Apply auth and rate limiting to all routes
router.use(authMiddleware);
router.use(apiLimiter);

// Question bank endpoints - only admin and teacher
// POST - add question (needs adminOnly or teacherOnly)
router.post("/add", adminOnly, questionbankController.addQuestion);

// GET - view questions for a topic (needs adminOnly or teacherOnly)
router.get("/:topic_id", adminOnly, questionbankController.getQuestionsByTopic);

// DELETE - delete question (needs adminOnly or teacherOnly)
router.delete("/:id", adminOnly, questionbankController.deleteQuestion);

module.exports = router;

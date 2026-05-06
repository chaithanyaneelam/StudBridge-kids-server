const express = require("express");
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const teacherOnly = require("../middleware/teacherOnly");
const { apiLimiter } = require("../middleware/rateLimiter");
const quizController = require("../controllers/quiz.controller");

/**
 * Quiz Routes - Protected with Auth
 * POST /platform/create     ← admin creates global platform quiz
 * POST /class/create        ← teacher creates class quiz
 * GET /available            ← student sees available quizzes
 * GET /join/:room_code      ← student joins room, gets questions
 * PUT /start/:room_id       ← teacher starts quiz
 * POST /submit              ← student submits score
 * PUT /end/:room_id         ← teacher ends quiz
 * GET /results/:room_code   ← anyone sees results
 * GET /my-history           ← student sees their history
 */
const router = express.Router();

// Apply auth and rate limiting to all routes
router.use(authMiddleware);
router.use(apiLimiter);

// Admin creates platform quiz
router.post("/platform/create", adminOnly, quizController.createPlatformQuiz);

// Teacher creates class quiz
router.post("/class/create", teacherOnly, quizController.createClassQuiz);

// Student views available quizzes
router.get("/available", quizController.getAvailableQuizzes);

// Student joins room and gets questions
router.get("/join/:room_code", quizController.joinRoom);

// Teacher starts quiz
router.put("/start/:room_id", teacherOnly, quizController.startRoom);

// Student submits attempt
router.post("/submit", quizController.submitAttempt);

// Teacher ends quiz
router.put("/end/:room_id", teacherOnly, quizController.endRoom);

// Anyone views results
router.get("/results/:room_code", quizController.getRoomResults);

// Student views their quiz history
router.get("/my-history", quizController.getMyQuizHistory);

module.exports = router;

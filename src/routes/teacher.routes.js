const express = require("express");
const authMiddleware = require("../middleware/auth");
const teacherOnly = require("../middleware/teacherOnly");
const { apiLimiter } = require("../middleware/rateLimiter");
const teacherController = require("../controllers/teacher.controller");

/**
 * Teacher Routes - All Protected with Auth + Teacher Verification
 * All routes require authentication and teacher role
 *
 * GET /my-students      ← teacher sees their section students list
 * GET /section-progress ← teacher sees full progress of their section
 * GET /weak-students    ← teacher sees students struggling in topics
 */
const router = express.Router();

// Apply auth and teacher middleware to all routes
router.use(authMiddleware);
router.use(teacherOnly);

// Student management
router.get("/my-students", apiLimiter, teacherController.getMyStudents);
router.get(
  "/section-progress",
  apiLimiter,
  teacherController.getSectionProgress,
);
router.get("/weak-students", apiLimiter, teacherController.getWeakStudents);

// Profile management
router.get("/profile", apiLimiter, teacherController.getProfile);

module.exports = router;

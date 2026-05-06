const express = require("express");
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { apiLimiter } = require("../middleware/rateLimiter");
const adminController = require("../controllers/admin.controller");

/**
 * Admin Routes - All Protected with Auth + Admin Verification
 * All routes require authentication and school_admin role
 *
 * POST   /schools                ← create school
 * POST   /chapters               ← create chapter
 * GET    /chapters               ← get chapters by class and board
 * POST   /topics                 ← create topic
 * GET    /topics                 ← get topics by chapter
 * PUT    /topics/:id             ← edit topic
 * DELETE /topics/:id             ← delete topic
 * PUT    /chapters/:id           ← edit chapter
 * DELETE /chapters/:id           ← delete chapter
 * POST   /teachers               ← create a teacher account
 * POST   /teachers/assign        ← assign teacher to class and section
 * GET    /teachers/:school_id    ← get all teachers for a school
 * POST   /students/bulk          ← bulk create students for a school
 * GET    /students/section       ← get students in a specific section
 */
const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminOnly);

// School management
router.post("/schools", apiLimiter, adminController.createSchool);
router.get("/schools", apiLimiter, adminController.getSchools);

// Chapter management
router.post("/chapters", apiLimiter, adminController.createChapter);
router.get("/chapters", apiLimiter, adminController.getChapters);
router.put("/chapters/:id", apiLimiter, adminController.updateChapter);
router.delete("/chapters/:id", apiLimiter, adminController.deleteChapter);

// Topic management
router.post("/topics", apiLimiter, adminController.createTopic);
router.get("/topics", apiLimiter, adminController.getTopics);
router.put("/topics/:id", apiLimiter, adminController.updateTopic);
router.delete("/topics/:id", apiLimiter, adminController.deleteTopic);

// Teacher management
router.post("/teachers", apiLimiter, adminController.createTeacher);
router.post("/teachers/assign", apiLimiter, adminController.assignTeacher);
router.get(
  "/teachers/:school_id",
  apiLimiter,
  adminController.getTeachersBySchool,
);

// Student management
router.post("/students/bulk", apiLimiter, adminController.bulkCreateStudents);
router.get(
  "/students/section",
  apiLimiter,
  adminController.getStudentsBySection,
);

module.exports = router;

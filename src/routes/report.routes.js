const express = require("express");
const authMiddleware = require("../middleware/auth");
const { apiLimiter } = require("../middleware/rateLimiter");
const reportController = require("../controllers/report.controller");

/**
 * Report Routes - All Protected with Auth
 * POST /generate ← student generates on-demand report for selected chapters
 */
const router = express.Router();

// Apply auth and rate limiting to all routes
router.use(authMiddleware);
router.use(apiLimiter);

// Report endpoints
router.post("/generate", reportController.generateReport);

module.exports = router;

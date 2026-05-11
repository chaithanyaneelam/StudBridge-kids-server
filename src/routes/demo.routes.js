const express = require("express");
const router = express.Router();
const demoController = require("../controllers/demo.controller");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { authLimiter, apiLimiter } = require("../middleware/rateLimiter");

// Public — no auth needed — rate limited to prevent spam
router.post("/book", authLimiter, demoController.bookDemo);

// Admin only routes
router.get(
  "/bookings",
  auth,
  adminOnly,
  apiLimiter,
  demoController.getBookings,
);
router.put(
  "/bookings/:id/status",
  auth,
  adminOnly,
  apiLimiter,
  demoController.updateStatus,
);
router.get(
  "/bookings/stats",
  auth,
  adminOnly,
  apiLimiter,
  demoController.getStats,
);

module.exports = router;

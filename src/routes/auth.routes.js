const express = require("express");
const authController = require("../controllers/auth.controller");
const { authLimiter, apiLimiter } = require("../middleware/rateLimiter");
const authMiddleware = require("../middleware/auth");

/**
 * Authentication Routes
 * POST /register - Register new user (rate limited)
 * POST /login - Login user (rate limited)
 * POST /logout - Logout user (no rate limit)
 * POST /change-password - Change password (protected, rate limited)
 */
const router = express.Router();

// Register endpoint with auth rate limiter
router.post("/register", authLimiter, authController.register);

// Login endpoint with auth rate limiter
router.post("/login", authLimiter, authController.login);

// Logout endpoint (no rate limit needed)
router.post("/logout", authController.logout);

// Change password endpoint (protected, rate limited)
router.post(
  "/change-password",
  authMiddleware,
  apiLimiter,
  authController.changePassword,
);

module.exports = router;

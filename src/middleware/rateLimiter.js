const rateLimit = require("express-rate-limit");

/**
 * Auth Rate Limiter
 * Limits login/register endpoints to 10 requests per 15 minutes.
 * Prevents brute force attacks on authentication endpoints.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 110, // 10 requests
  standardHeaders: false, // Disable the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many authentication attempts. Please try again later.",
    });
  },
});

/**
 * API Rate Limiter
 * Limits general API endpoints to 100 requests per 15 minutes.
 * Applied to all /api routes to prevent abuse.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1100, // 100 requests
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests. Please try again later.",
    });
  },
});

module.exports = { authLimiter, apiLimiter };

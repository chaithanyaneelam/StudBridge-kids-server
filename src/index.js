require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const pool = require("./config/db");
const { apiLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth.routes");
const topicRoutes = require("./routes/topic.routes");
const progressRoutes = require("./routes/progress.routes");
const adminRoutes = require("./routes/admin.routes");
const teacherRoutes = require("./routes/teacher.routes");
const leaderboardRoutes = require("./routes/leaderboard.routes");
const questionbankRoutes = require("./routes/questionbank.routes");
const quizRoutes = require("./routes/quiz.routes");
const reportRoutes = require("./routes/report.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Add security headers with helmet
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
);

// Security: Safe XSS sanitization — sanitize body fields manually
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    const sanitize = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === "string") {
          // Remove script tags and dangerous HTML
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/javascript:/gi, "")
            .replace(/on\w+\s*=/gi, "");
        } else if (typeof obj[key] === "object") {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
});

// Cookie Parser: MUST be before routes so res.cookie() and req.cookies work correctly
app.use(cookieParser());

// CORS Configuration: credentials: true and explicit FRONTEND_URL required for HttpOnly cookies
// If using wildcard origin, cookies will be blocked by browser
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "https://sudbridge-kids-client.vercel.app",
      "https://studbridge.com",
      "https://www.studbridge.com",
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body Parser: Parse incoming JSON requests with 10kb limit to prevent large payloads
app.use(express.json({ limit: "10kb" }));

// Rate Limiter: Apply general rate limiting to all /api routes
app.use("/api", apiLimiter);

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "StudBridge Kids server is running" });
});

// Routes: Mount all API routes
app.use("/api/auth", authRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/questions", questionbankRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/reports", reportRoutes);

// Global Error Handler: Must be last
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   StudBridge Kids Backend Server       ║
║   Running on port ${PORT}                   ║
║   Environment: ${process.env.NODE_ENV || "development"}               ║
╚════════════════════════════════════════╝
  `);
});

// Graceful Shutdown
process.on("SIGINT", async () => {
  console.log("\n✓ Shutting down gracefully...");
  await pool.end();
  process.exit(0);
});

module.exports = app;

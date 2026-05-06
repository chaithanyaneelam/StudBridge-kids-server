const { ZodError } = require("zod");

/**
 * Global Error Handler Middleware
 * Catches all errors passed via next(err).
 * Distinguishes between user errors (safe to show) and unexpected server errors (hide details).
 * Handles Zod validation, PostgreSQL constraint violations, JWT errors, and business logic errors.
 */
module.exports = (err, req, res, next) => {
  console.error("Error:", err.message);

  // Zod validation error — user sent wrong data
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Validation failed",
      fields: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // PostgreSQL unique constraint violation — duplicate email or reg number
  if (err.code === "23505") {
    const field = err.detail?.match(/\(([^)]+)\)/)?.[1] || "field";
    return res.status(409).json({
      error: `${field} already exists. Please use a different value.`,
    });
  }

  // PostgreSQL foreign key violation — invalid reference
  if (err.code === "23503") {
    return res.status(400).json({
      error: "Invalid reference — the related record does not exist.",
    });
  }

  // PostgreSQL not null violation — required field missing
  if (err.code === "23502") {
    const field = err.column || "field";
    return res.status(400).json({
      error: `${field} is required and cannot be empty.`,
    });
  }

  // JWT errors — authentication issues
  if (err.name === "JsonWebTokenError") {
    return res
      .status(401)
      .json({ error: "Invalid token. Please login again." });
  }
  if (err.name === "TokenExpiredError") {
    return res
      .status(401)
      .json({ error: "Session expired. Please login again." });
  }

  // Known business logic errors thrown manually in services
  // These are thrown with a status property attached
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Known manual errors thrown in services without status
  // If the error message is a short clean string it is safe to show
  if (
    err.message &&
    err.message.length < 150 &&
    !err.message.includes("at Object")
  ) {
    return res.status(400).json({ error: err.message });
  }

  // Unknown server error — hide internal details
  console.error("Unexpected error stack:", err.stack);
  return res.status(500).json({
    error: "An unexpected error occurred. Please try again later.",
  });
};

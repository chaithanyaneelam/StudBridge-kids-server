/**
 * Teacher Authorization Middleware
 * Checks if user role is teacher or school_admin. This middleware runs after auth middleware.
 * Returns 403 if user is not a teacher/admin, otherwise allows access.
 */
const teacherOnly = (req, res, next) => {
  // Check if user has teacher or school_admin role
  if (
    req.user.role !== "teacher" &&
    req.user.role !== "school_admin" &&
    req.user.role !== "super_admin"
  ) {
    return res.status(403).json({ error: "Access denied. Teachers only." });
  }

  // User is teacher/admin, allow access
  next();
};

module.exports = teacherOnly;

/**
 * Admin Authorization Middleware
 * Checks if user role is school_admin or super_admin. This middleware runs after auth middleware.
 * Returns 403 if user is not an admin, otherwise allows access.
 */
const adminOnly = (req, res, next) => {
  // Check if user has admin role (school_admin or super_admin)
  if (req.user.role !== "school_admin" && req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  // User is admin, allow access
  next();
};

module.exports = adminOnly;

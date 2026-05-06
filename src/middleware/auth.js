const jwt = require("jsonwebtoken");

/**
 * JWT Verification Middleware
 * Extracts and verifies JWT token from HttpOnly cookie (req.cookies.token).
 * Attaches decoded payload to req.user if valid.
 * Returns 401 if token is missing, 403 if invalid or expired.
 */
const authMiddleware = (req, res, next) => {
  try {
    // Extract token from HttpOnly cookie
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(403)
        .json({ error: "Session expired, please login again" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ error: "Invalid token" });
    }
    return res.status(403).json({ error: "Token verification failed" });
  }
};

module.exports = authMiddleware;

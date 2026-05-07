const jwt = require("jsonwebtoken");

/**
 * JWT Verification Middleware
 * Extracts and verifies JWT token from Authorization header OR HttpOnly cookie.
 * Attaches decoded payload to req.user if valid.
 */
const authMiddleware = (req, res, next) => {
  try {
    let token;

    // 1. Check for Authorization header (Bearer token) - This is what your Next.js app uses
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    // 2. Fallback to checking the cookie
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 3. If no token found in either place, reject
    if (!token) {
      return res
        .status(401)
        .json({ error: "Authentication required. Please provide a token." });
    }

    console.log("=== AUTH DEBUGGING ===");
    console.log("Token received:", token);
    console.log("JWT Secret exists:", !!process.env.JWT_SECRET);

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

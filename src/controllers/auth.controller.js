const authService = require("../services/auth.service");
const { registerSchema, loginSchema } = require("../validators/auth.validator");

// Register controller - Validates input with Zod, calls service, returns 201 created response
const register = async (req, res, next) => {
  try {
    // Validate request body with Zod schema
    const validatedData = registerSchema.parse(req.body);

    // Call service to register user
    const newUser = await authService.registerUser(validatedData);

    // Return 201 created response
    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

// Login controller - Validates input with Zod, calls service, sets HttpOnly cookie, returns user
const login = async (req, res, next) => {
  try {
    // Validate request body with Zod schema
    const validatedData = loginSchema.parse(req.body);

    // Call service to authenticate user
    const { token, user, passwordResetRequired } = await authService.loginUser(
      validatedData.identifier,
      validatedData.password,
      validatedData.school_id,
    );

    // Set JWT as HttpOnly Secure cookie (30 days)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      // sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    });

    // Return success response with user data
    res.status(200).json({
      message: "Login successful",
      user,
      passwordResetRequired,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

// Logout controller - Clears the authentication cookie and returns success message
const logout = (req, res) => {
  // Clear the token cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  // Return logout success response
  res.status(200).json({
    message: "Logged out successfully",
  });
};

// Change password controller - Validates new password, updates in database, returns success
const changePassword = async (req, res, next) => {
  try {
    // Validate request body with Zod schema
    const { changePasswordSchema } = require("../validators/auth.validator");
    const validatedData = changePasswordSchema.parse(req.body);

    // Get user ID from JWT token in req.user
    const user_id = req.user.id;

    // Call service to change password
    const result = await authService.changePassword(
      user_id,
      validatedData.newPassword,
    );

    // Return 200 success response
    res.status(200).json(result);
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  changePassword,
};

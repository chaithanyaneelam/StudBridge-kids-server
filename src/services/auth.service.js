const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/user.repository");

/**
 * Register a new user
 * Hashes password with bcrypt (12 rounds), creates user, returns safe object
 * @param {Object} data - User registration data (validated by Zod)
 * @returns {Promise<Object>} Created user object without password_hash
 */
const registerUser = async (data) => {
  // Check if email already exists before trying to insert
  if (data.email) {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      const err = new Error(
        "An account with this email already exists. Please login instead.",
      );
      err.status = 409;
      throw err;
    }
  }

  // Hash password with 12 rounds
  const password_hash = await bcrypt.hash(data.password, 12);

  // Create user in database
  const newUser = await userRepository.createUser({
    ...data,
    password_hash,
  });

  // Return user without password_hash field
  const { password_hash: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

/**
 * Login user with email or registration number
 * Verifies password, generates JWT token with 30-day expiry
 * @param {string} identifier - Email or school registration number
 * @param {string} password - User password (plain text)
 * @param {number} school_id - School ID (required when identifier is roll number)
 * @returns {Promise<Object>} Object with token, user, and passwordResetRequired flag
 */
const loginUser = async (identifier, password, school_id) => {
  let user;

  // Determine if identifier is email or registration number
  if (identifier.includes("@")) {
    // Email login
    user = await userRepository.findByEmail(identifier);
  } else {
    // Registration number login (must have school_id)
    user = await userRepository.findByRegNumber(school_id, identifier);
  }

  // User not found - never reveal which field was wrong
  if (!user) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  // Compare password with stored hash
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  // Generate JWT token with 30-day expiry
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      school_id: user.school_id,
      class_id: user.class_id,
      board_id: user.board_id,
      plan: user.plan,
      section: user.section,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" },
  );

  // Return safe user object (without password_hash)
  const { password_hash: _, ...userWithoutPassword } = user;

  return {
    token,
    user: userWithoutPassword,
    passwordResetRequired: user.requires_password_reset,
  };
};

/**
 * Change user password
 * Hashes new password with bcrypt (12 rounds) and updates in database
 * @param {number} user_id - User ID
 * @param {string} newPassword - New password (plain text)
 * @returns {Promise<Object>} Success message
 */
const changePassword = async (user_id, newPassword) => {
  // Hash new password with 12 rounds
  const password_hash = await bcrypt.hash(newPassword, 12);

  // Update password in database
  await userRepository.updatePassword(user_id, password_hash);

  // Return success message
  return { message: "Password updated successfully" };
};

module.exports = {
  registerUser,
  loginUser,
  changePassword,
};

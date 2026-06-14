const pool = require("../config/db");

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null if not found
 */
const findByEmail = async (email) => {
  const query = "SELECT * FROM users WHERE email = $1 LIMIT 1";
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
};

/**
 * Find user by school registration number and school ID
 * @param {number} school_id - School ID
 * @param {string} reg_number - School registration number
 * @returns {Promise<Object|null>} User object or null if not found
 */
const findByRegNumber = async (school_id, reg_number) => {
  const query =
    "SELECT * FROM users WHERE school_id = $1 AND school_reg_number = $2 LIMIT 1";
  const result = await pool.query(query, [school_id, reg_number]);
  return result.rows[0] || null;
};

/**
 * Create a new user
 * @param {Object} data - User data including fullname, email, password_hash, school_id, etc.
 * @returns {Promise<Object>} Created user object
 */
const createUser = async (data) => {
  const {
    fullname,
    email,
    password_hash,
    school_id,
    school_reg_number,
    class_id,
    board_id,
    parent_phone,
    role = "student",
    school_name_string,
  } = data;

  // Note: If school_id is optional and null, the database must have the column as nullable.
  // If foreign key constraint exists on school_id, it must allow NULL values.
  // Otherwise, school_id must be provided or the column must have a default value.

  const query = `
    INSERT INTO users (fullname, email, password_hash, school_id, school_reg_number, 
                       class_id, board_id, parent_phone, role, school_name_string, requires_password_reset)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, [
      fullname,
      email || null,
      password_hash,
      school_id || null,
      school_reg_number || null,
      class_id,
      board_id,
      parent_phone || null,
      role,
      school_name_string || null,
    ]);
    return result.rows[0];
  } catch (error) {
    // Handle foreign key constraint error for school_id
    if (error.code === "23503" && error.constraint === "users_school_id_fkey") {
      const err = new Error(
        "Invalid school_id: School does not exist. Please provide a valid school_id or ensure the school exists in the database.",
      );
      err.statusCode = 400;
      throw err;
    }
    throw error;
  }
};

/**
 * Find user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
const findById = async (id) => {
  const query = "SELECT * FROM users WHERE id = $1 LIMIT 1";
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Get a user's plan access info, with paid-vs-free computed in SQL.
 * is_paid is true only for a non-empty, non-'free' plan whose plan_expiry is
 * today or later — keeping the paid/expiry boundary on the same server-date
 * clock (CURRENT_DATE) as the daily play reset.
 * @param {number} user_id - User ID
 * @returns {Promise<{plan: string|null, plan_expiry: (Date|null), is_paid: boolean}|null>}
 */
const getAccessInfo = async (user_id) => {
  const query = `
    SELECT
      plan,
      plan_expiry,
      (
        plan IS NOT NULL
        AND plan <> ''
        AND plan <> 'free'
        AND plan_expiry IS NOT NULL
        AND plan_expiry >= CURRENT_DATE
      ) AS is_paid
    FROM users
    WHERE id = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows[0] || null;
};

/**
 * Update password reset flag for user
 * @param {number} id - User ID
 * @returns {Promise<Object>} Updated user object
 */
const updatePasswordResetFlag = async (id) => {
  const query =
    "UPDATE users SET requires_password_reset = false WHERE id = $1 RETURNING *;";
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

/**
 * Update user's password and reset requires_password_reset flag
 * @param {number} user_id - User ID
 * @param {string} password_hash - Hashed password
 * @returns {Promise<Object>} Updated user object
 */
const updatePassword = async (user_id, password_hash) => {
  const query =
    "UPDATE users SET password_hash = $2, requires_password_reset = FALSE WHERE id = $1 RETURNING *;";
  const result = await pool.query(query, [user_id, password_hash]);
  return result.rows[0];
};

module.exports = {
  findByEmail,
  findByRegNumber,
  createUser,
  findById,
  getAccessInfo,
  updatePasswordResetFlag,
  updatePassword,
};

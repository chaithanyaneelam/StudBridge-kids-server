/**
 * User Model
 * Represents a student user in the StudBridge Kids platform
 *
 * Table: users
 * Fields:
 * - id: Primary key
 * - fullname: Student's full name
 * - email: Optional email address
 * - password_hash: Bcrypt hashed password
 * - school_id: Reference to school
 * - school_reg_number: School registration/roll number
 * - class_id: Reference to class
 * - board_id: Reference to board (CBSE, ICSE, etc.)
 * - parent_phone: Parent's contact number
 * - role: User role (student, teacher, admin)
 * - requires_password_reset: Flag for password reset on first login
 * - created_at: Account creation timestamp
 * - updated_at: Last account update timestamp
 */

// This file serves as documentation for the users table structure
// Database queries should be handled via repositories/user.repository.js

module.exports = {};

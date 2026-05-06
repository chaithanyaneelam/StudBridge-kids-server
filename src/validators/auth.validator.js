const { z } = require("zod");

/**
 * Registration Schema Validator
 * Validates user registration data including optional fields for school assignment.
 */
const registerSchema = z.object({
  fullname: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  school_id: z.number().int().optional(),
  school_reg_number: z
    .string()
    .max(50, "School registration number must not exceed 50 characters")
    .optional()
    .or(z.literal("")),
  class_id: z
    .number()
    .int("Class ID must be a valid integer")
    .positive("Class ID must be a positive number"),
  board_id: z
    .number()
    .int("Board ID must be a valid integer")
    .positive("Board ID must be a positive number"),
  parent_phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Parent phone must be a valid 10-digit number")
    .optional()
    .or(z.literal("")),
  role: z
    .enum(
      ["student", "teacher", "parent"],
      "Role must be student, teacher, or parent",
    )
    .optional()
    .default("student"),
  school_name_string: z
    .string()
    .min(2, "School name must be at least 2 characters")
    .max(255, "School name must not exceed 255 characters")
    .optional()
    .or(z.literal("")),
});

/**
 * Login Schema Validator
 * Accepts either email or school registration number as identifier.
 * school_id is required when logging in by registration number.
 */
const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email or registration number is required")
    .max(100, "Identifier must not exceed 100 characters"),
  password: z.string().min(1, "Password is required"),
  school_id: z
    .number()
    .int()
    .positive("School ID must be a positive number")
    .optional(),
});

/**
 * Change Password Schema Validator
 * Validates new password during password change operation
 */
const changePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must not exceed 100 characters"),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
};

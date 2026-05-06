const { z } = require("zod");

/**
 * Zod schema for teacher creation
 */
const teacherSchema = z.object({
  fullname: z
    .string()
    .min(2, "Teacher name must be at least 2 characters")
    .max(255, "Teacher name must not exceed 255 characters"),
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  school_id: z
    .number()
    .int("School ID must be an integer")
    .positive("School ID must be positive"),
});

/**
 * Zod schema for assigning teacher to class and section
 */
const assignTeacherSchema = z.object({
  teacher_id: z
    .number()
    .int("Teacher ID must be an integer")
    .positive("Teacher ID must be positive"),
  class_id: z
    .number()
    .int("Class ID must be an integer")
    .positive("Class ID must be positive"),
  section: z
    .string()
    .min(1, "Section is required")
    .max(5, "Section must not exceed 5 characters"),
});

/**
 * Zod schema for bulk student creation
 */
const bulkStudentSchema = z.object({
  school_id: z
    .number()
    .int("School ID must be an integer")
    .positive("School ID must be positive"),
  class_id: z
    .number()
    .int("Class ID must be an integer")
    .positive("Class ID must be positive"),
  board_id: z
    .number()
    .int("Board ID must be an integer")
    .positive("Board ID must be positive"),
  section: z
    .string()
    .min(1, "Section is required")
    .max(5, "Section must not exceed 5 characters"),
  students: z
    .array(
      z.object({
        fullname: z
          .string()
          .min(2, "Student name must be at least 2 characters")
          .max(255, "Student name must not exceed 255 characters"),
        school_reg_number: z
          .string()
          .min(1, "School registration number is required"),
        parent_phone: z.string().optional().nullable(),
      }),
    )
    .min(1, "Must provide at least one student"),
});

module.exports = {
  teacherSchema,
  assignTeacherSchema,
  bulkStudentSchema,
};

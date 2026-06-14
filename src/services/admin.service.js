const bcrypt = require("bcrypt");
const adminRepository = require("../repositories/admin.repository");

/**
 * Create a new teacher
 * Hashes password with bcrypt 12 rounds, creates teacher, returns without password
 * @param {Object} data - Teacher data (validated by Zod)
 * @returns {Promise<Object>} Created teacher without password_hash
 */
const createTeacher = async (data) => {
  try {
    // Hash password with 12 rounds
    const password_hash = await bcrypt.hash(data.password, 12);

    // Create teacher in database
    const teacher = await adminRepository.createTeacher({
      fullname: data.fullname,
      email: data.email,
      password_hash,
      school_id: data.school_id,
    });

    return teacher;
  } catch (error) {
    // Handle duplicate email error
    if (error.code === "23505") {
      const err = new Error("A teacher with this email already exists");
      err.status = 409;
      throw err;
    }

    // Handle foreign key constraint (school_id doesn't exist)
    if (error.code === "23503") {
      const err = new Error("School ID does not exist");
      err.status = 400;
      throw err;
    }

    // Handle any other error
    const err = new Error(`Failed to create teacher: ${error.message}`);
    err.status = 500;
    throw err;
  }
};

/**
 * Assign a teacher to a class and section
 * @param {number} school_id - School ID
 * @param {number} teacher_id - Teacher ID
 * @param {number} class_id - Class ID
 * @param {string} section - Section
 * @returns {Promise<Object>} Created assignment
 */
const assignTeacher = async (school_id, teacher_id, class_id, section) => {
  try {
    const assignment = await adminRepository.assignTeacher(
      school_id,
      teacher_id,
      class_id,
      section,
    );
    return assignment;
  } catch (error) {
    // If error already has status, rethrow as-is
    if (error.status) {
      throw error;
    }

    // Handle foreign key constraint violations (teacher_id, class_id, or school_id don't exist)
    if (error.code === "23503") {
      const err = new Error(
        "Invalid teacher_id, class_id, or school_id. Please verify all IDs exist.",
      );
      err.status = 400;
      throw err;
    }

    // Handle any other database error
    const err = new Error(`Failed to assign teacher: ${error.message}`);
    err.status = 500;
    throw err;
  }
};

/**
 * Get all teachers for a school
 * @param {number} school_id - School ID
 * @returns {Promise<Array>} Array of teachers with assignments
 */
const getTeachersBySchool = async (school_id) => {
  const teachers = await adminRepository.getTeachersBySchool(school_id);
  return teachers;
};

/**
 * Bulk create students for a school
 * Hash password once, then reuse for all students
 * @param {Object} data - Contains school_id, class_id, board_id, section, students array
 * @returns {Promise<Object>} Count of created students and default password
 */
const bulkCreateStudents = async (data) => {
  try {
    const { school_id, class_id, board_id, section, students } = data;

    // Set single default password for all students
    const defaultPassword = "studbridge123";

    // Hash password once with 12 rounds
    const password_hash = await bcrypt.hash(defaultPassword, 12);

    // Map students array to add required fields
    const mappedStudents = students.map((student) => ({
      fullname: student.fullname,
      email: null, // Students typically don't have emails
      password_hash, // Reuse the same hash for all students
      school_id,
      class_id,
      board_id,
      school_reg_number: student.school_reg_number,
      section,
      requires_password_reset: true,
      role: "student",
      parent_phone: student.parent_phone || null,
    }));

    // Call repository to bulk create students (provisioned as paid for 1 year)
    const createdIds = await adminRepository.bulkCreateStudents(mappedStudents);
    const count = createdIds.length;

    return {
      count,
      message: `${count} students created successfully`,
      defaultPassword,
      note: "Share this default password with the school. Students will be prompted to reset it on first login.",
    };
  } catch (error) {
    // Handle duplicate registration number error
    if (error.code === "23505") {
      const e = new Error(
        "One or more roll numbers already exist in this school. Please check and try again.",
      );
      e.status = 409;
      throw e;
    }

    // Handle foreign key constraint errors
    if (error.code === "23503") {
      const err = new Error(
        "Invalid school_id, class_id, or board_id. Please verify all IDs exist.",
      );
      err.status = 400;
      throw err;
    }

    // Handle any other error
    const err = new Error(`Failed to bulk create students: ${error.message}`);
    err.status = 500;
    throw err;
  }
};

/**
 * Get all students in a section
 * @param {number} school_id - School ID
 * @param {number} class_id - Class ID
 * @param {string} section - Section
 * @returns {Promise<Array>} Array of students
 */
const getStudentsBySection = async (school_id, class_id, section) => {
  const students = await adminRepository.getStudentsBySection(
    school_id,
    class_id,
    section,
  );
  return students;
};

module.exports = {
  createTeacher,
  assignTeacher,
  getTeachersBySchool,
  bulkCreateStudents,
  getStudentsBySection,
};

const pool = require("../config/db");

/**
 * Create a new teacher
 * @param {Object} data - Teacher data with fullname, email, password_hash, school_id
 * @returns {Promise<Object>} Created teacher without password_hash
 */
const createTeacher = async (data) => {
  const { fullname, email, password_hash, school_id } = data;

  const query = `
    INSERT INTO users (fullname, email, password_hash, school_id, role, requires_password_reset)
    VALUES ($1, $2, $3, $4, 'teacher', true)
    RETURNING id, fullname, email, school_id, role, created_at;
  `;

  const result = await pool.query(query, [
    fullname,
    email,
    password_hash,
    school_id,
  ]);
  return result.rows[0];
};

/**
 * Assign a teacher to a class and section
 * @param {number} school_id - School ID
 * @param {number} teacher_id - Teacher ID
 * @param {number} class_id - Class ID
 * @param {string} section - Section (e.g., "A", "B", "C")
 * @returns {Promise<Object>} Created assignment
 */
const assignTeacher = async (school_id, teacher_id, class_id, section) => {
  const query = `
    INSERT INTO class_teacher_assignments (school_id, teacher_id, class_id, section)
    VALUES ($1, $2, $3, $4)
    RETURNING id, school_id, teacher_id, class_id, section;
  `;

  try {
    const result = await pool.query(query, [
      school_id,
      teacher_id,
      class_id,
      section,
    ]);
    return result.rows[0];
  } catch (error) {
    // Check for unique constraint violation (duplicate assignment)
    if (error.code === "23505") {
      const err = new Error(
        "Teacher already assigned to this class and section",
      );
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Get all teachers for a school with their assigned class and section
 * @param {number} school_id - School ID
 * @returns {Promise<Array>} Array of teachers with assignments
 */
const getTeachersBySchool = async (school_id) => {
  const query = `
    SELECT 
      u.id,
      u.fullname,
      u.email,
      u.school_id,
      cta.class_id,
      cta.section,
      cta.id as assignment_id
    FROM users u
    LEFT JOIN class_teacher_assignments cta ON u.id = cta.teacher_id
    WHERE u.school_id = $1 AND u.role = 'teacher'
    ORDER BY u.fullname ASC;
  `;

  const result = await pool.query(query, [school_id]);
  return result.rows;
};

/**
 * Bulk create students for a school.
 *
 * School-uploaded students are provisioned as paid for one year: each user row
 * gets plan = 'paid' and plan_expiry = today + 12 months, and a matching
 * subscriptions row is created with the 'yearly' tier and the same 12-month
 * term. The users insert and the subscriptions insert run in a single
 * transaction so a partial failure creates no students without a subscription.
 *
 * @param {Array} students - Array of student objects with all required fields
 * @returns {Promise<Array<number>>} IDs of created students
 */
const bulkCreateStudents = async (students) => {
  if (!students || students.length === 0) {
    return [];
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Insert users with paid status + 12-month expiry
    const userValues = [];
    const userPlaceholders = [];

    students.forEach((student, index) => {
      const offset = index * 11; // 11 bound values per student
      // plan ('paid') and plan_expiry (today + 12 months) are constants
      userPlaceholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, 'paid', CURRENT_DATE + INTERVAL '12 months')`,
      );
      userValues.push(
        student.fullname,
        student.email || null,
        student.password_hash,
        student.school_id,
        student.class_id,
        student.board_id,
        student.school_reg_number,
        student.section,
        student.requires_password_reset,
        student.role || "student",
        student.parent_phone || null,
      );
    });

    const userQuery = `
      INSERT INTO users (
        fullname, email, password_hash, school_id, class_id, board_id,
        school_reg_number, section, requires_password_reset, role, parent_phone,
        plan, plan_expiry
      )
      VALUES ${userPlaceholders.join(", ")}
      RETURNING id, school_id, school_reg_number;
    `;

    const userResult = await client.query(userQuery, userValues);
    const createdUsers = userResult.rows;

    // 2. Insert a yearly subscription row per created student
    const subValues = [];
    const subPlaceholders = [];
    const grantedAt = Date.now();

    createdUsers.forEach((user, index) => {
      const offset = index * 4; // 4 bound values per subscription
      subPlaceholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months')`,
      );
      subValues.push(
        user.id,
        "yearly",
        0, // school-sponsored grant — no payment amount
        `ADMIN_${user.school_id}_${user.school_reg_number}_${grantedAt}`,
      );
    });

    const subQuery = `
      INSERT INTO subscriptions (
        user_id, plan, amount, razorpay_id, start_date, expiry_date
      )
      VALUES ${subPlaceholders.join(", ")};
    `;

    await client.query(subQuery, subValues);

    await client.query("COMMIT");

    return createdUsers.map((user) => user.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all students in a specific section
 * @param {number} school_id - School ID
 * @param {number} class_id - Class ID
 * @param {string} section - Section
 * @returns {Promise<Array>} Array of students
 */
const getStudentsBySection = async (school_id, class_id, section) => {
  const query = `
    SELECT 
      id,
      fullname,
      email,
      school_reg_number,
      parent_phone,
      class_id,
      section,
      created_at
    FROM users
    WHERE school_id = $1 AND class_id = $2 AND section = $3 AND role = 'student'
    ORDER BY fullname ASC;
  `;

  const result = await pool.query(query, [school_id, class_id, section]);
  return result.rows;
};

module.exports = {
  createTeacher,
  assignTeacher,
  getTeachersBySchool,
  bulkCreateStudents,
  getStudentsBySection,
};

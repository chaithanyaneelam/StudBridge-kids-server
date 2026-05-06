const pool = require("../config/db");

/**
 * Get my students - list of all students in teacher's assigned class and section
 * @param {number} school_id - School ID
 * @param {number} class_id - Class ID
 * @param {string} section - Section
 * @returns {Promise<Array>} Array of students
 */
const getMyStudents = async (school_id, class_id, section) => {
  const query = `
    SELECT 
      id,
      fullname,
      school_reg_number,
      parent_phone
    FROM users
    WHERE school_id = $1 AND class_id = $2 AND section = $3 AND role = 'student'
    ORDER BY fullname ASC;
  `;

  const result = await pool.query(query, [school_id, class_id, section]);
  return result.rows;
};

/**
 * Get student progress - all students with their topic progress
 * @param {number} school_id - School ID
 * @param {number} class_id - Class ID
 * @param {string} section - Section
 * @returns {Promise<Array>} Array of students with their progress
 */
const getStudentProgress = async (school_id, class_id, section) => {
  const query = `
    SELECT 
      u.id,
      u.fullname,
      u.school_reg_number,
      t.name as topic_name,
      c.name as chapter_name,
      c.order_index,
      COALESCE(tp.play_count, 0) as play_count,
      tp.last_played
    FROM users u
    LEFT JOIN topic_progress tp ON u.id = tp.user_id
    LEFT JOIN topics t ON tp.topic_id = t.id
    LEFT JOIN chapters c ON t.chapter_id = c.id
    WHERE u.school_id = $1 AND u.class_id = $2 AND u.section = $3 AND u.role = 'student'
    ORDER BY u.fullname ASC, c.order_index ASC;
  `;

  const result = await pool.query(query, [school_id, class_id, section]);
  return result.rows;
};

/**
 * Get weak students - students with less than 3 plays on any topic (including never played)
 * @param {number} school_id - School ID
 * @param {number} class_id - Class ID
 * @param {string} section - Section
 * @returns {Promise<Array>} Array of weak students with topic details
 */
const getWeakStudents = async (school_id, class_id, section) => {
  const query = `
    SELECT 
      u.id,
      u.fullname,
      u.school_reg_number,
      t.name as topic_name,
      COALESCE(tp.play_count, 0) as play_count
    FROM users u
    LEFT JOIN topic_progress tp ON u.id = tp.user_id
    LEFT JOIN topics t ON tp.topic_id = t.id
    WHERE u.school_id = $1 AND u.class_id = $2 AND u.section = $3 
      AND u.role = 'student'
      AND (tp.play_count IS NULL OR tp.play_count < 3)
    ORDER BY u.fullname ASC, t.name ASC;
  `;

  const result = await pool.query(query, [school_id, class_id, section]);
  return result.rows;
};

/**
 * Get teacher profile with their school and class assignment details
 * @param {number} teacher_id - Teacher ID
 * @returns {Promise<Object>} Teacher profile with school and class info
 */
const getTeacherProfile = async (teacher_id) => {
  const query = `
    SELECT 
      u.id,
      u.fullname,
      u.email,
      u.created_at,
      s.name AS school_name,
      s.city AS school_city,
      c.name AS class_name,
      cta.section,
      cta.assigned_at
    FROM users u
    LEFT JOIN schools s ON s.id = u.school_id
    LEFT JOIN class_teacher_assignments cta ON cta.teacher_id = u.id
    LEFT JOIN classes c ON c.id = cta.class_id
    WHERE u.id = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [teacher_id]);
  return result.rows[0] || null;
};

module.exports = {
  getMyStudents,
  getStudentProgress,
  getWeakStudents,
  getTeacherProfile,
};

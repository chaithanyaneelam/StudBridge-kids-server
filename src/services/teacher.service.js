const pool = require("../config/db");
const teacherRepository = require("../repositories/teacher.repository");

/**
 * Get teacher's assigned class and section
 * @param {number} teacher_id - Teacher ID
 * @returns {Promise<Object>} Teacher assignment with school_id, class_id, section
 */
const getTeacherAssignment = async (teacher_id) => {
  const query = `
    SELECT school_id, class_id, section
    FROM class_teacher_assignments
    WHERE teacher_id = $1
    LIMIT 1;
  `;

  const result = await pool.query(query, [teacher_id]);

  if (!result.rows[0]) {
    const error = new Error("Teacher has not been assigned to any class");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

/**
 * Get my students - all students in teacher's assigned section
 * @param {number} teacher_id - Teacher ID
 * @returns {Promise<Array>} Array of students
 */
const getMyStudents = async (teacher_id) => {
  const assignment = await getTeacherAssignment(teacher_id);
  const students = await teacherRepository.getMyStudents(
    assignment.school_id,
    assignment.class_id,
    assignment.section,
  );
  return students;
};

/**
 * Get section progress - all students with grouped topic progress
 * @param {number} teacher_id - Teacher ID
 * @returns {Promise<Array>} Array of students with progress arrays
 */
const getSectionProgress = async (teacher_id) => {
  const assignment = await getTeacherAssignment(teacher_id);
  const progress = await teacherRepository.getStudentProgress(
    assignment.school_id,
    assignment.class_id,
    assignment.section,
  );

  // Group results by student
  const groupedByStudent = {};
  progress.forEach((row) => {
    if (!groupedByStudent[row.id]) {
      groupedByStudent[row.id] = {
        id: row.id,
        fullname: row.fullname,
        school_reg_number: row.school_reg_number,
        progress: [],
      };
    }

    // Only add topic progress if topic_name exists
    if (row.topic_name) {
      groupedByStudent[row.id].progress.push({
        topic_name: row.topic_name,
        chapter_name: row.chapter_name,
        play_count: row.play_count,
        last_played: row.last_played,
      });
    }
  });

  return Object.values(groupedByStudent);
};

/**
 * Get weak students - students struggling with topics
 * @param {number} teacher_id - Teacher ID
 * @returns {Promise<Array>} Array of weak students
 */
const getWeakStudents = async (teacher_id) => {
  const assignment = await getTeacherAssignment(teacher_id);
  const weakStudents = await teacherRepository.getWeakStudents(
    assignment.school_id,
    assignment.class_id,
    assignment.section,
  );
  return weakStudents;
};

/**
 * Get teacher profile - profile with school and class assignment details
 * @param {number} teacher_id - Teacher ID
 * @returns {Promise<Object>} Teacher profile with school and class info
 */
const getTeacherProfile = async (teacher_id) => {
  const profile = await teacherRepository.getTeacherProfile(teacher_id);
  if (!profile) {
    const err = new Error("Teacher profile not found");
    err.status = 404;
    throw err;
  }
  return profile;
};

module.exports = {
  getMyStudents,
  getSectionProgress,
  getWeakStudents,
  getTeacherProfile,
};

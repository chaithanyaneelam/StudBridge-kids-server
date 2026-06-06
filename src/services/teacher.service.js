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

/**
 * Get topic accuracy grouped by student then chapter then topic
 * Fetches teacher assignment first, then queries practice_results
 * @param {number} teacher_id - Teacher ID
 * @returns {Promise<Array>} Students with nested chapters and topic accuracy
 */
const getSectionTopicAccuracy = async (teacher_id) => {
  // Get teacher's assigned class and section from class_teacher_assignments
  const assignment = await pool.query(
    `SELECT school_id, class_id, section
     FROM class_teacher_assignments
     WHERE teacher_id = $1 LIMIT 1`,
    [teacher_id],
  );

  if (!assignment.rows[0]) {
    return [];
  }

  const { school_id, class_id, section } = assignment.rows[0];
  const rows = await teacherRepository.getSectionTopicAccuracy(
    school_id,
    class_id,
    section,
  );

  if (rows.length === 0) return [];

  // Group flat rows into nested structure:
  // { student_id, student_name, reg_number, chapters: [{ chapter_id, chapter_name, topics: [...] }] }
  const studentMap = {};

  rows.forEach((row) => {
    const sid = row.student_id;

    if (!studentMap[sid]) {
      studentMap[sid] = {
        student_id: sid,
        student_name: row.student_name,
        reg_number: row.school_reg_number,
        chapters: {},
      };
    }

    const cid = row.chapter_id;
    if (!studentMap[sid].chapters[cid]) {
      studentMap[sid].chapters[cid] = {
        chapter_id: cid,
        chapter_name: row.chapter_name,
        chapter_order: row.chapter_order,
        topics: [],
      };
    }

    studentMap[sid].chapters[cid].topics.push({
      topic_id: row.topic_id,
      topic_name: row.topic_name,
      topic_order: row.topic_order,
      total_correct: parseInt(row.total_correct) || 0,
      total_wrong: parseInt(row.total_wrong) || 0,
      total_attempts: parseInt(row.total_attempts) || 0,
      accuracy_percent:
        row.accuracy_percent !== null ? parseFloat(row.accuracy_percent) : null,
    });
  });

  // Convert nested maps to sorted arrays
  return Object.values(studentMap).map((student) => ({
    ...student,
    chapters: Object.values(student.chapters)
      .sort((a, b) => a.chapter_order - b.chapter_order)
      .map((chapter) => ({
        ...chapter,
        topics: chapter.topics.sort((a, b) => a.topic_order - b.topic_order),
      })),
  }));
};

module.exports = {
  getMyStudents,
  getSectionProgress,
  getWeakStudents,
  getTeacherProfile,
  getSectionTopicAccuracy,
};

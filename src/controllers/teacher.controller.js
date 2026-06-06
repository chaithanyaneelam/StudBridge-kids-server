const teacherService = require("../services/teacher.service");

/**
 * Get my students - teacher sees their section students list
 * Gets teacher_id from req.user.id, calls service, returns array
 */
const getMyStudents = async (req, res, next) => {
  try {
    // Get teacher ID from authenticated user
    const teacher_id = req.user.id;

    // Call service to fetch students
    const students = await teacherService.getMyStudents(teacher_id);

    // Return students array
    res.status(200).json({
      message: "Students retrieved successfully",
      data: students,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Get section progress - teacher sees full progress of their section
 * Gets teacher_id from req.user.id, calls service, returns grouped result
 */
const getSectionProgress = async (req, res, next) => {
  try {
    // Get teacher ID from authenticated user
    const teacher_id = req.user.id;

    // Call service to fetch and group section progress
    const progress = await teacherService.getSectionProgress(teacher_id);

    // Return grouped progress
    res.status(200).json({
      message: "Section progress retrieved successfully",
      data: progress,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Get weak students - teacher sees students struggling in topics
 * Gets teacher_id from req.user.id, calls service, returns result
 */
const getWeakStudents = async (req, res, next) => {
  try {
    // Get teacher ID from authenticated user
    const teacher_id = req.user.id;

    // Call service to fetch weak students
    const weakStudents = await teacherService.getWeakStudents(teacher_id);

    // Return weak students
    res.status(200).json({
      message: "Weak students retrieved successfully",
      data: weakStudents,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Get profile - teacher retrieves their profile with school and class details
 * Gets teacher_id from req.user.id, calls service, returns profile
 */
const getProfile = async (req, res, next) => {
  try {
    const teacher_id = req.user.id;
    const profile = await teacherService.getTeacherProfile(teacher_id);
    res.status(200).json({ data: profile });
  } catch (err) {
    next(err);
  }
};

/**
 * Get topic accuracy - teacher sees all students in their section with
 * topic accuracy grouped by chapter
 * Gets teacher_id from req.user.id, calls service, returns grouped result
 */
const getTopicAccuracy = async (req, res, next) => {
  try {
    const teacher_id = req.user.id;
    const data = await teacherService.getSectionTopicAccuracy(teacher_id);
    res.status(200).json({
      data,
      count: data.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyStudents,
  getSectionProgress,
  getWeakStudents,
  getProfile,
  getTopicAccuracy,
};

const contentService = require("../services/content.service");
const adminService = require("../services/admin.service");
const {
  schoolSchema,
  chapterSchema,
  topicSchema,
} = require("../validators/content.validator");
const {
  teacherSchema,
  assignTeacherSchema,
  bulkStudentSchema,
} = require("../validators/admin.validator");

/**
 * Create a new school
 * Validates input, calls service, returns 201
 */
const createSchool = async (req, res, next) => {
  try {
    // Validate request body with Zod schema
    const validatedData = schoolSchema.parse(req.body);

    // Call service to create school
    const school = await contentService.createSchool(validatedData);

    // Return 201 created response
    res.status(201).json({
      message: "School created successfully",
      data: school,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Get all schools
 * Fetches all schools from database, returns 200
 */
const getSchools = async (req, res, next) => {
  try {
    // Call service to fetch all schools
    const schools = await contentService.getAllSchools();

    // Return schools array
    res.status(200).json({
      message: "Schools retrieved successfully",
      data: schools,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Create a new chapter
 * Validates input, calls service, returns 201
 */
const createChapter = async (req, res, next) => {
  try {
    // Validate request body with Zod schema
    const validatedData = chapterSchema.parse(req.body);

    // Call service to create chapter
    const chapter = await contentService.createChapter(validatedData);

    // Return 201 created response
    res.status(201).json({
      message: "Chapter created successfully",
      data: chapter,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Get chapters by class and board
 * Reads class_id and board_id from query params, calls service
 */
const getChapters = async (req, res, next) => {
  try {
    const class_id = parseInt(req.query.class_id, 10);
    const board_id = parseInt(req.query.board_id, 10);

    if (isNaN(class_id) || isNaN(board_id)) {
      return res.status(400).json({
        error: "class_id and board_id are required query parameters",
      });
    }

    // Call service to fetch chapters
    const chapters = await contentService.getAllChapters(class_id, board_id);

    // Return chapters array
    res.status(200).json({
      message: "Chapters retrieved successfully",
      data: chapters,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Create a new topic
 * Validates input, calls service, returns 201
 */
const createTopic = async (req, res, next) => {
  try {
    // Validate request body with Zod schema
    const validatedData = topicSchema.parse(req.body);

    // Call service to create topic
    const topic = await contentService.createTopic(validatedData);

    // Return 201 created response
    res.status(201).json({
      message: "Topic created successfully",
      data: topic,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Get topics by chapter
 * Reads chapter_id from query param, calls service
 */
const getTopics = async (req, res, next) => {
  try {
    // Extract query parameter
    const chapter_id = parseInt(req.query.chapter_id, 10);

    if (isNaN(chapter_id)) {
      return res.status(400).json({
        error: "chapter_id is a required query parameter",
      });
    }

    // Call service to fetch topics
    const topics = await contentService.getAllTopics(chapter_id);

    // Return topics array
    res.status(200).json({
      message: "Topics retrieved successfully",
      data: topics,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Update a topic
 * Reads id from URL params, validates body, calls service
 */
const updateTopic = async (req, res, next) => {
  try {
    // Extract topic ID from URL params
    const id = parseInt(req.params.id, 10);

    // Validate ID is valid number
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "Topic ID must be a valid integer",
      });
    }

    // Validate request body with partial Zod schema
    const validatedData = topicSchema.partial().parse(req.body);

    // Call service to update topic
    const topic = await contentService.updateTopic(id, validatedData);

    // Return updated topic
    res.status(200).json({
      message: "Topic updated successfully",
      data: topic,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Delete a topic
 * Reads id from URL params, calls service
 */
const deleteTopic = async (req, res, next) => {
  try {
    // Extract topic ID from URL params
    const id = parseInt(req.params.id, 10);

    // Validate ID is valid number
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "Topic ID must be a valid integer",
      });
    }

    // Call service to delete topic
    await contentService.deleteTopic(id);

    // Return success response
    res.status(200).json({
      message: "Topic deleted successfully",
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Update a chapter
 * Reads id from URL params, validates body, calls service
 */
const updateChapter = async (req, res, next) => {
  try {
    // Extract chapter ID from URL params
    const id = parseInt(req.params.id, 10);

    // Validate ID is valid number
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "Chapter ID must be a valid integer",
      });
    }

    // Validate request body with partial Zod schema
    const validatedData = chapterSchema.partial().parse(req.body);

    // Call service to update chapter
    const chapter = await contentService.updateChapter(id, validatedData);

    // Return updated chapter
    res.status(200).json({
      message: "Chapter updated successfully",
      data: chapter,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Delete a chapter
 * Reads id from URL params, calls service
 */
const deleteChapter = async (req, res, next) => {
  try {
    // Extract chapter ID from URL params
    const id = parseInt(req.params.id, 10);

    // Validate ID is valid number
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "Chapter ID must be a valid integer",
      });
    }

    // Call service to delete chapter
    await contentService.deleteChapter(id);

    // Return success response
    res.status(200).json({
      message: "Chapter deleted successfully",
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Create a new teacher
 * Validates input, calls service, returns 201
 */
const createTeacher = async (req, res, next) => {
  try {
    // Validate request body with Zod schema
    const validatedData = teacherSchema.parse(req.body);

    // Call service to create teacher
    const teacher = await adminService.createTeacher(validatedData);

    // Return 201 created response
    res.status(201).json({
      message: "Teacher created successfully",
      data: teacher,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Assign a teacher to a class and section
 * Validates input, calls service, returns 201
 */
const assignTeacher = async (req, res, next) => {
  try {
    // Validate request body with Zod schema
    const validatedData = assignTeacherSchema.parse(req.body);

    // Get school_id from request body
    const school_id = req.body.school_id;

    // Validate school_id is provided
    if (!school_id) {
      return res.status(400).json({
        error: "school_id is required",
      });
    }

    // Call service to assign teacher
    const assignment = await adminService.assignTeacher(
      school_id,
      validatedData.teacher_id,
      validatedData.class_id,
      validatedData.section,
    );

    // Return 201 created response
    res.status(201).json({
      message: "Teacher assigned successfully",
      data: assignment,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Get all teachers for a school
 * Reads school_id from URL params, calls service
 */
const getTeachersBySchool = async (req, res, next) => {
  try {
    // Extract school ID from URL params
    const school_id = parseInt(req.params.school_id, 10);

    // Validate school_id is valid number
    if (!Number.isInteger(school_id)) {
      return res.status(400).json({
        error: "school_id must be a valid integer",
      });
    }

    // Call service to fetch teachers
    const teachers = await adminService.getTeachersBySchool(school_id);

    // Return teachers array
    res.status(200).json({
      message: "Teachers retrieved successfully",
      data: teachers,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Bulk create students for a school
 * Validates input, calls service, returns 201 with count and default password
 */
const bulkCreateStudents = async (req, res, next) => {
  try {
    // Validate request body with Zod schema
    const validatedData = bulkStudentSchema.parse(req.body);

    // Call service to bulk create students
    const result = await adminService.bulkCreateStudents(validatedData);

    // Return 201 created response with count and default password
    res.status(201).json({
      message: result.message,
      count: result.count,
      defaultPassword: result.defaultPassword,
      note: result.note,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Get all students in a specific section
 * Reads school_id, class_id, section from query params, calls service
 */
const getStudentsBySection = async (req, res, next) => {
  try {
    // Extract query parameters
    const school_id = parseInt(req.query.school_id, 10);
    const class_id = parseInt(req.query.class_id, 10);
    const section = req.query.section;

    // Validate parameters are valid
    if (
      !Number.isInteger(school_id) ||
      !Number.isInteger(class_id) ||
      !section
    ) {
      return res.status(400).json({
        error:
          "school_id, class_id, and section must all be provided and valid",
      });
    }

    // Call service to fetch students
    const students = await adminService.getStudentsBySection(
      school_id,
      class_id,
      section,
    );

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

module.exports = {
  createSchool,
  getSchools,
  createChapter,
  getChapters,
  createTopic,
  getTopics,
  updateTopic,
  deleteTopic,
  updateChapter,
  deleteChapter,
  createTeacher,
  assignTeacher,
  getTeachersBySchool,
  bulkCreateStudents,
  getStudentsBySection,
};

const {
  createPlatformQuizSchema,
  createClassQuizSchema,
  joinRoomSchema,
  submitAttemptSchema,
} = require("../validators/quiz.validator");
const quizService = require("../services/quiz.service");

/**
 * Create a platform quiz - admin only
 * @param {Object} req - Express request with validated body and req.user
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const createPlatformQuiz = async (req, res, next) => {
  try {
    // Validate request body
    const validatedData = createPlatformQuizSchema.parse(req.body);

    // Get admin ID from authenticated user
    const admin_id = req.user.id;

    // Call service to create platform quiz
    const quiz = await quizService.createPlatformQuiz(
      admin_id,
      validatedData.class_id,
      validatedData.starts_at,
      validatedData.chapter_id,
      validatedData.topic_id,
      validatedData.question_limit,
    );

    // Return created quiz
    res.status(201).json({
      message: "Platform quiz created successfully",
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a class quiz - teacher only
 * @param {Object} req - Express request with validated body and req.user
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const createClassQuiz = async (req, res, next) => {
  try {
    // Validate request body
    const validatedData = createClassQuizSchema.parse(req.body);

    // Get teacher ID and school ID from authenticated user
    const teacher_id = req.user.id;
    const school_id = req.user.school_id;

    // Call service to create class quiz
    const quiz = await quizService.createClassQuiz(
      teacher_id,
      school_id,
      validatedData.class_id,
      validatedData.starts_at,
      validatedData.chapter_id,
      validatedData.topic_id,
      validatedData.question_limit,
    );

    // Return created quiz
    res.status(201).json({
      message: "Class quiz created successfully",
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available quizzes for student
 * @param {Object} req - Express request with req.user
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const getAvailableQuizzes = async (req, res, next) => {
  try {
    // Get class_id and school_id from authenticated user
    const class_id = req.user.class_id;
    const school_id = req.user.school_id;

    // Call service to fetch available quizzes
    const quizzes = await quizService.getAvailableQuizzes(class_id, school_id);

    // Return quizzes
    res.status(200).json({
      message: "Available quizzes retrieved successfully",
      data: quizzes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Join quiz room - get questions without answers
 * @param {Object} req - Express request with room_code in params
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const joinRoom = async (req, res, next) => {
  try {
    // Validate request body
    const validatedData = joinRoomSchema.parse({
      room_code: req.params.room_code,
    });

    // Call service to join room
    const roomData = await quizService.joinRoom(
      validatedData.room_code,
      req.user,
    );

    // Return room and questions
    res.status(200).json({
      message: "Joined quiz room successfully",
      data: roomData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start quiz room - teacher only
 * @param {Object} req - Express request with room_id in params
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const startRoom = async (req, res, next) => {
  try {
    // Get room_id from URL params
    const room_id = parseInt(req.params.room_id, 10);

    if (isNaN(room_id)) {
      const error = new Error("Invalid room ID");
      error.statusCode = 400;
      throw error;
    }

    // Get teacher_id from authenticated user
    const teacher_id = req.user.id;

    // Call service to start room
    const room = await quizService.startRoom(room_id, teacher_id);

    // Return updated room
    res.status(200).json({
      message: "Quiz room started successfully",
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit quiz attempt - student submits score
 * @param {Object} req - Express request with validated body
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const submitAttempt = async (req, res, next) => {
  try {
    // Validate request body
    const validatedData = submitAttemptSchema.parse(req.body);

    // Get user_id from authenticated user
    const user_id = req.user.id;

    // Call service to submit attempt
    const result = await quizService.submitAttempt(
      user_id,
      validatedData.room_code,
      validatedData.score,
      validatedData.total_marks,
    );

    // Return score and rank
    res.status(200).json({
      message: "Quiz attempt submitted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * End quiz room - teacher only
 * @param {Object} req - Express request with room_id in params
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const endRoom = async (req, res, next) => {
  try {
    // Get room_id from URL params
    const room_id = parseInt(req.params.room_id, 10);

    if (isNaN(room_id)) {
      const error = new Error("Invalid room ID");
      error.statusCode = 400;
      throw error;
    }

    // Get teacher_id from authenticated user
    const teacher_id = req.user.id;

    // Call service to end room
    const room = await quizService.endRoom(room_id, teacher_id);

    // Return updated room
    res.status(200).json({
      message: "Quiz room ended successfully",
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get quiz results leaderboard
 * @param {Object} req - Express request with room_code in params
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const getRoomResults = async (req, res, next) => {
  try {
    // Get room_code from URL params
    const room_code = req.params.room_code;

    // Call service to get results
    const results = await quizService.getRoomResults(room_code);

    // Return results
    res.status(200).json({
      message: "Quiz results retrieved successfully",
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student's quiz history
 * @param {Object} req - Express request with req.user
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const getMyQuizHistory = async (req, res, next) => {
  try {
    // Get user_id from authenticated user
    const user_id = req.user.id;

    // Call service to fetch history
    const history = await quizService.getMyQuizHistory(user_id);

    // Return history
    res.status(200).json({
      message: "Quiz history retrieved successfully",
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPlatformQuiz,
  createClassQuiz,
  getAvailableQuizzes,
  joinRoom,
  startRoom,
  submitAttempt,
  endRoom,
  getRoomResults,
  getMyQuizHistory,
};

const progressService = require("../services/progress.service");
const {
  topicOpenSchema,
  practiceResultSchema,
} = require("../validators/progress.validator");

const topicOpened = async (req, res, next) => {
  try {
    const validatedData = topicOpenSchema.parse(req.body);

    const user_id = req.user.id;

    // Record topic open in database (role gates the free-tier daily limit)
    const progress = await progressService.recordTopicOpen(
      user_id,
      validatedData.topic_id,
      req.user.role,
    );

    // Return success response
    res.status(200).json({
      message: "Topic progress recorded",
      data: progress,
    });
  } catch (error) {
    // Free-tier daily limit reached — return a structured 403 the frontend can
    // act on (lock + upgrade prompt) without leaning on the generic handler.
    if (error.code === "PLAY_LIMIT_REACHED") {
      return res.status(403).json({
        error: error.message,
        code: error.code,
        resets_at: error.resets_at,
      });
    }
    // Pass other errors to global error handler
    next(error);
  }
};

const practiceCompleted = async (req, res, next) => {
  try {
    // Validate request body with Zod schema
    const validatedData = practiceResultSchema.parse(req.body);

    // Get user_id from decoded JWT
    const user_id = req.user.id;

    // Save practice result to database
    const result = await progressService.recordPracticeResult(
      user_id,
      validatedData.topic_id,
      validatedData.ans_correct,
      validatedData.ans_wrong,
    );

    // Return success response
    res.status(200).json({
      message: "Practice result recorded",
      data: result,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

/**
 * Get the logged-in student's play-access status (free/paid, locked, resets_at)
 * so the frontend can render all games with lock overlays for free users.
 */
const getPlayAccess = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const status = await progressService.getPlayAccess(user_id, req.user.role);

    res.status(200).json({
      message: "Play access retrieved",
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all progress for logged-in student
 * Gets user_id from JWT, calls service
 */
const getMyProgress = async (req, res, next) => {
  try {
    // Get user_id from decoded JWT
    const user_id = req.user.id;

    // Fetch all progress records for user
    const progress = await progressService.getUserProgress(user_id);

    // Return progress data
    res.status(200).json({
      message: "Student progress retrieved",
      data: progress,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

module.exports = {
  topicOpened,
  practiceCompleted,
  getPlayAccess,
  getMyProgress,
};

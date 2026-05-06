const progressService = require("../services/progress.service");
const {
  topicOpenSchema,
  practiceResultSchema,
} = require("../validators/progress.validator");

const topicOpened = async (req, res, next) => {
  try {
    const validatedData = topicOpenSchema.parse(req.body);

    const user_id = req.user.id;

    // Record topic open in database
    const progress = await progressService.recordTopicOpen(
      user_id,
      validatedData.topic_id,
    );

    // Return success response
    res.status(200).json({
      message: "Topic progress recorded",
      data: progress,
    });
  } catch (error) {
    // Pass errors to global error handler
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
  getMyProgress,
};

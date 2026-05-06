const { questionSchema } = require("../validators/questionbank.validator");
const questionbankService = require("../services/questionbank.service");

/**
 * Add a new question to the question bank
 * Only admins and teachers can add questions
 * @param {Object} req - Express request with validated body and req.user
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const addQuestion = async (req, res, next) => {
  try {
    // Validate request body
    const validatedData = questionSchema.parse(req.body);

    // Get creator ID from authenticated user
    const created_by = req.user.id;

    // Call service to add question
    const question = await questionbankService.addQuestion(
      validatedData,
      created_by,
    );

    // Return created question
    res.status(201).json({
      message: "Question added successfully",
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all questions for a specific topic
 * @param {Object} req - Express request with topic_id in params
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const getQuestionsByTopic = async (req, res, next) => {
  try {
    // Get topic ID from URL params
    const topic_id = parseInt(req.params.topic_id, 10);

    if (isNaN(topic_id)) {
      const error = new Error("Invalid topic ID");
      error.statusCode = 400;
      throw error;
    }

    // Call service to fetch questions
    const questions = await questionbankService.getQuestionsByTopic(topic_id);

    // Return questions
    res.status(200).json({
      message: "Questions retrieved successfully",
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a question from the question bank
 * @param {Object} req - Express request with question id in params
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const deleteQuestion = async (req, res, next) => {
  try {
    // Get question ID from URL params
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      const error = new Error("Invalid question ID");
      error.statusCode = 400;
      throw error;
    }

    // Call service to delete question
    const result = await questionbankService.deleteQuestion(id);

    // Return success message
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addQuestion,
  getQuestionsByTopic,
  deleteQuestion,
};

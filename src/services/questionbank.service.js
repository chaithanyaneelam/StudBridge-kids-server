const questionbankRepository = require("../repositories/questionbank.repository");

/**
 * Add a new question to the question bank
 * @param {Object} data - Question data from validated request
 * @param {number} created_by - User ID of question creator
 * @returns {Promise<Object>} Created question
 */
const addQuestion = async (data, created_by) => {
  const question = await questionbankRepository.addQuestion(
    data.topic_id,
    data.question,
    data.option_a,
    data.option_b,
    data.option_c,
    data.option_d,
    data.correct_ans,
    data.difficulty,
    data.marks,
    created_by,
  );
  return question;
};

/**
 * Get all questions for a specific topic
 * @param {number} topic_id - Topic ID
 * @returns {Promise<Array>} Array of questions
 */
const getQuestionsByTopic = async (topic_id) => {
  const questions = await questionbankRepository.getQuestionsByTopic(topic_id);
  return questions;
};

/**
 * Delete a question from the question bank
 * @param {number} id - Question ID
 * @returns {Promise<Object>} Success message
 */
const deleteQuestion = async (id) => {
  const deleted = await questionbankRepository.deleteQuestion(id);

  if (!deleted) {
    const error = new Error("Question not found");
    error.statusCode = 404;
    throw error;
  }

  return { message: "Question deleted successfully" };
};

module.exports = {
  addQuestion,
  getQuestionsByTopic,
  deleteQuestion,
};

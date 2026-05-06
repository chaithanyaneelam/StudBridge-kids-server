const pool = require("../config/db");

/**
 * Add new question to question bank
 * @param {number} topic_id - Topic ID
 * @param {string} question - Question text
 * @param {string} option_a - Option A
 * @param {string} option_b - Option B
 * @param {string} option_c - Option C
 * @param {string} option_d - Option D
 * @param {string} correct_ans - Correct answer (A, B, C, or D)
 * @param {string} difficulty - Difficulty level (easy, medium, hard)
 * @param {number} marks - Marks for this question
 * @param {number} created_by - User ID who created this question
 * @returns {Promise<Object>} Created question
 */
const addQuestion = async (
  topic_id,
  question,
  option_a,
  option_b,
  option_c,
  option_d,
  correct_ans,
  difficulty,
  marks,
  created_by,
) => {
  const query = `
    INSERT INTO question_bank 
    (topic_id, question, option_a, option_b, option_c, option_d, correct_ans, difficulty, marks, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const result = await pool.query(query, [
    topic_id,
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_ans,
    difficulty,
    marks,
    created_by,
  ]);
  return result.rows[0];
};

/**
 * Get all questions for a topic ordered by difficulty
 * @param {number} topic_id - Topic ID
 * @returns {Promise<Array>} Array of questions
 */
const getQuestionsByTopic = async (topic_id) => {
  const query = `
    SELECT * FROM question_bank
    WHERE topic_id = $1
    ORDER BY difficulty, id ASC;
  `;

  const result = await pool.query(query, [topic_id]);
  return result.rows;
};

/**
 * Get random questions for a topic
 * @param {number} topic_id - Topic ID
 * @param {number} limit - Number of random questions to return
 * @returns {Promise<Array>} Array of random questions
 */
const getRandomQuestionsByTopic = async (topic_id, limit) => {
  const query = `
    SELECT * FROM question_bank
    WHERE topic_id = $1
    ORDER BY RANDOM()
    LIMIT $2;
  `;

  const result = await pool.query(query, [topic_id, limit]);
  return result.rows;
};

/**
 * Get random questions for a chapter (by joining topics)
 * @param {number} chapter_id - Chapter ID
 * @param {number} limit - Number of random questions to return
 * @returns {Promise<Array>} Array of random questions
 */
const getRandomQuestionsByChapter = async (chapter_id, limit) => {
  const query = `
    SELECT qb.* FROM question_bank qb
    JOIN topics t ON qb.topic_id = t.id
    WHERE t.chapter_id = $1
    ORDER BY RANDOM()
    LIMIT $2;
  `;

  const result = await pool.query(query, [chapter_id, limit]);
  return result.rows;
};

/**
 * Delete question from question bank by ID
 * @param {number} id - Question ID
 * @returns {Promise<Object>} Result of deletion
 */
const deleteQuestion = async (id) => {
  const query = `
    DELETE FROM question_bank
    WHERE id = $1
    RETURNING id;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  addQuestion,
  getQuestionsByTopic,
  getRandomQuestionsByTopic,
  getRandomQuestionsByChapter,
  deleteQuestion,
};

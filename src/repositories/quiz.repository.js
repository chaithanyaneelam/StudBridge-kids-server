const pool = require("../config/db");
const questionbankRepository = require("./questionbank.repository");

/**
 * Generate random 6-character alphanumeric room code
 * @returns {string} Random room code
 */
const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Create a new quiz room
 * Generates room_code and sets expires_at to 24 hours from starts_at
 * @param {number} created_by - User ID of quiz creator
 * @param {number} school_id - School ID (null for platform quizzes)
 * @param {number} class_id - Class ID
 * @param {string} starts_at - When quiz starts (datetime string)
 * @param {string} quiz_type - Type: 'platform' or 'class'
 * @param {number} chapter_id - Chapter ID
 * @param {number} topic_id - Topic ID (optional)
 * @returns {Promise<Object>} Created quiz room with room_code
 */
const createRoom = async (
  created_by,
  school_id,
  class_id,
  starts_at,
  quiz_type,
  chapter_id,
  topic_id,
) => {
  const room_code = generateRoomCode();
  const query = `
    INSERT INTO quiz_rooms 
    (room_code, created_by, school_id, class_id, status, starts_at, quiz_type, expires_at, chapter_id, topic_id)
    VALUES ($1, $2, $3, $4, 'waiting', $5, $6, $5::timestamp + INTERVAL '24 hours', $7, $8)
    RETURNING *;
  `;

  const result = await pool.query(query, [
    room_code,
    created_by,
    school_id || null,
    class_id,
    starts_at,
    quiz_type,
    chapter_id,
    topic_id || null,
  ]);
  return result.rows[0];
};

/**
 * Copy questions from question bank to quiz_questions
 * Fetches random questions based on topic_id or chapter_id
 * @param {number} quiz_id - Quiz room ID
 * @param {number} topic_id - Topic ID (if provided, fetch from this topic)
 * @param {number} chapter_id - Chapter ID (if topic_id not provided)
 * @param {number} limit - Number of questions to copy
 * @returns {Promise<number>} Count of questions copied
 */
const copyQuestionsFromBank = async (quiz_id, topic_id, chapter_id, limit) => {
  let questions = [];

  if (topic_id) {
    // Fetch random questions by topic
    questions = await questionbankRepository.getRandomQuestionsByTopic(
      topic_id,
      limit,
    );
  } else {
    // Fetch random questions by chapter
    questions = await questionbankRepository.getRandomQuestionsByChapter(
      chapter_id,
      limit,
    );
  }

  if (questions.length === 0) {
    return 0;
  }

  // Insert all questions into quiz_questions
  const placeholders = questions
    .map(
      (_, i) =>
        `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`,
    )
    .join(",");

  const values = questions.flatMap((q, i) => [
    quiz_id,
    q.question,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
    q.correct_ans,
    i + 1, // order_index
    q.marks,
  ]);

  const query = `
    INSERT INTO quiz_questions 
    (quiz_id, question, option_a, option_b, option_c, option_d, correct_ans, order_index, marks)
    VALUES ${placeholders.replace(/\$(\d+)/g, (_, num) => {
      const adjustedNum =
        Math.floor((parseInt(num) - 1) / 9) * 9 + ((parseInt(num) - 1) % 9) + 1;
      return `$${adjustedNum}`;
    })}
    RETURNING COUNT(*);
  `;

  // Simpler approach: Insert one by one
  let count = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const insertQuery = `
      INSERT INTO quiz_questions 
      (quiz_id, question, option_a, option_b, option_c, option_d, correct_ans, order_index, marks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id;
    `;
    await pool.query(insertQuery, [
      quiz_id,
      q.question,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_ans,
      i + 1,
      q.marks,
    ]);
    count++;
  }

  return count;
};

/**
 * Get all questions for a quiz (without correct answers)
 * Correct answers are never sent to frontend before submission
 * @param {number} quiz_id - Quiz room ID
 * @returns {Promise<Array>} Questions without correct_ans
 */
const getQuizQuestions = async (quiz_id) => {
  const query = `
    SELECT id, question, option_a, option_b, option_c, option_d, marks, order_index
    FROM quiz_questions
    WHERE quiz_id = $1
    ORDER BY order_index ASC;
  `;

  const result = await pool.query(query, [quiz_id]);
  return result.rows;
};

/**
 * Get quiz room details by room code
 * @param {string} room_code - 6-character room code
 * @returns {Promise<Object>} Quiz room details
 */
const getRoomByCode = async (room_code) => {
  const query = `
    SELECT * FROM quiz_rooms
    WHERE room_code = $1;
  `;

  const result = await pool.query(query, [room_code]);
  return result.rows[0];
};

/**
 * Get quiz room details by room ID
 * @param {number} id - Quiz room ID
 * @returns {Promise<Object>} Quiz room details
 */
const getRoomById = async (id) => {
  const query = `
    SELECT * FROM quiz_rooms
    WHERE id = $1;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};

/**
 * Update quiz room status
 * Valid statuses: waiting, live, ended
 * @param {number} id - Quiz room ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated room
 */
const updateRoomStatus = async (id, status) => {
  const query = `
    UPDATE quiz_rooms
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [status, id]);
  return result.rows[0];
};

/**
 * Submit quiz attempt - INSERT into quiz_attempts
 * Has UNIQUE constraint on (user_id, quiz_id)
 * @param {number} user_id - Student user ID
 * @param {number} quiz_id - Quiz room ID
 * @param {number} score - Score obtained
 * @param {number} total_marks - Total marks
 * @returns {Promise<Object>} Created attempt record
 */
const submitAttempt = async (user_id, quiz_id, score, total_marks) => {
  const query = `
    INSERT INTO quiz_attempts (user_id, quiz_id, score, total_marks, completed_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (user_id, quiz_id) 
    DO UPDATE SET score = $3, total_marks = $4, completed_at = NOW()
    RETURNING *;
  `;

  const result = await pool.query(query, [
    user_id,
    quiz_id,
    score,
    total_marks,
  ]);
  return result.rows[0];
};

/**
 * Get quiz results with rankings
 * @param {number} quiz_id - Quiz room ID
 * @returns {Promise<Array>} Results with rank, student name, score
 */
const getRoomResults = async (quiz_id) => {
  const query = `
    SELECT 
      qa.user_id,
      u.fullname,
      qa.score,
      qa.total_marks,
      RANK() OVER (ORDER BY qa.score DESC) as rank,
      qa.completed_at
    FROM quiz_attempts qa
    JOIN users u ON qa.user_id = u.id
    WHERE qa.quiz_id = $1
    ORDER BY qa.score DESC;
  `;

  const result = await pool.query(query, [quiz_id]);
  return result.rows;
};

/**
 * Get available quizzes for a student
 * Include platform quizzes (global) and class quizzes (school-specific)
 * @param {number} class_id - Student's class ID
 * @param {number} school_id - Student's school ID
 * @returns {Promise<Array>} Available quizzes
 */
const getAvailableQuizzes = async (class_id, school_id) => {
  const query = `
    SELECT * FROM quiz_rooms
    WHERE class_id = $1
      AND (
        (quiz_type = 'platform' AND status != 'ended' AND expires_at > NOW())
        OR
        (quiz_type = 'class' AND school_id = $2 AND status != 'ended' AND expires_at > NOW())
      )
    ORDER BY starts_at ASC;
  `;

  const result = await pool.query(query, [class_id, school_id]);
  return result.rows;
};

/**
 * Get student's quiz history
 * @param {number} user_id - Student user ID
 * @returns {Promise<Array>} Quiz history ordered by date
 */
const getStudentQuizHistory = async (user_id) => {
  const query = `
    SELECT 
      qr.room_code,
      qr.quiz_type,
      qa.score,
      qa.total_marks,
      qa.completed_at
    FROM quiz_attempts qa
    JOIN quiz_rooms qr ON qa.quiz_id = qr.id
    WHERE qa.user_id = $1
    ORDER BY qa.completed_at DESC;
  `;

  const result = await pool.query(query, [user_id]);
  return result.rows;
};

module.exports = {
  generateRoomCode,
  createRoom,
  copyQuestionsFromBank,
  getQuizQuestions,
  getRoomByCode,
  getRoomById,
  updateRoomStatus,
  submitAttempt,
  getRoomResults,
  getAvailableQuizzes,
  getStudentQuizHistory,
};

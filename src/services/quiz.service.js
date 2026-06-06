const quizRepository = require("../repositories/quiz.repository");
const pool = require("../config/db");

/**
 * Create platform quiz - only for school_admin role
 * Generates room code and copies questions from bank
 * @param {number} admin_id - Admin user ID
 * @param {number} class_id - Class ID
 * @param {string} starts_at - Start time
 * @param {number} chapter_id - Chapter ID
 * @param {number} topic_id - Topic ID (optional)
 * @param {number} question_limit - Number of questions to include
 * @returns {Promise<Object>} Created room with code and question count
 */
const createPlatformQuiz = async (
  admin_id,
  class_id,
  starts_at,
  chapter_id,
  topic_id,
  question_limit,
) => {
  let questionCount;
  if (topic_id) {
    const topicQuestions = await pool.query(
      "SELECT COUNT(*) as count FROM question_bank WHERE topic_id = $1",
      [topic_id],
    );
    questionCount = parseInt(topicQuestions.rows[0].count, 10);
  } else {
    const chapterQuestions = await pool.query(
      "SELECT COUNT(*) as count FROM question_bank qb JOIN topics t ON qb.topic_id = t.id WHERE t.chapter_id = $1",
      [chapter_id],
    );
    questionCount = parseInt(chapterQuestions.rows[0].count, 10);
  }

  if (questionCount < 5) {
    const error = new Error(
      "Not enough questions in bank for this topic. Please add more questions first.",
    );
    error.status = 400;
    throw error;
  }

  // Create room with quiz_type='platform', school_id=null
  const room = await quizRepository.createRoom(
    admin_id,
    null, // no school for platform quizzes
    class_id,
    starts_at,
    "platform",
    chapter_id,
    topic_id,
  );

  // Copy questions from bank
  const copiedCount = await quizRepository.copyQuestionsFromBank(
    room.id,
    topic_id,
    chapter_id,
    question_limit,
  );

  return {
    ...room,
    question_count: copiedCount,
  };
};

/**
 * Create class quiz - only for teacher role
 * Generates room code and copies questions from bank
 * @param {number} teacher_id - Teacher user ID
 * @param {number} school_id - School ID
 * @param {number} class_id - Class ID
 * @param {string} starts_at - Start time
 * @param {number} chapter_id - Chapter ID
 * @param {number} topic_id - Topic ID (optional)
 * @param {number} question_limit - Number of questions to include
 * @returns {Promise<Object>} Created room with code and question count
 */
const createClassQuiz = async (
  teacher_id,
  school_id,
  class_id,
  starts_at,
  chapter_id,
  topic_id,
  question_limit,
) => {
  // Check if there are enough questions in the bank
  let questionCount;
  if (topic_id) {
    const topicQuestions = await pool.query(
      "SELECT COUNT(*) as count FROM question_bank WHERE topic_id = $1",
      [topic_id],
    );
    questionCount = parseInt(topicQuestions.rows[0].count, 10);
  } else {
    const chapterQuestions = await pool.query(
      "SELECT COUNT(*) as count FROM question_bank qb JOIN topics t ON qb.topic_id = t.id WHERE t.chapter_id = $1",
      [chapter_id],
    );
    questionCount = parseInt(chapterQuestions.rows[0].count, 10);
  }

  if (questionCount < 5) {
    const error = new Error(
      "Not enough questions in bank for this topic. Please add more questions first.",
    );
    error.status = 400;
    throw error;
  }

  // Create room with quiz_type='class'
  const room = await quizRepository.createRoom(
    teacher_id,
    school_id,
    class_id,
    starts_at,
    "class",
    chapter_id,
    topic_id,
  );

  // Copy questions from bank
  const copiedCount = await quizRepository.copyQuestionsFromBank(
    room.id,
    topic_id,
    chapter_id,
    question_limit,
  );

  return {
    ...room,
    question_count: copiedCount,
  };
};

/**
 * Get available quizzes for a student
 * Completed quizzes are excluded so they are not shown again on the dashboard.
 * @param {number} class_id - Student's class ID
 * @param {number} school_id - Student's school ID
 * @param {number} user_id - Student's user ID
 * @returns {Promise<Array>} Available quizzes
 */
const getAvailableQuizzes = async (class_id, school_id, user_id) => {
  const quizzes = await quizRepository.getAvailableQuizzes(
    class_id,
    school_id,
    user_id,
  );
  return quizzes;
};

/**
 * Join quiz room - validates and returns questions without answers
 * @param {string} room_code - Room code
 * @param {Object} user - Authenticated user object
 * @returns {Promise<Object>} Room details and questions without correct answers
 */
const joinRoom = async (room_code, user) => {
  // Get room by code
  const room = await quizRepository.getRoomByCode(room_code);

  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if quiz has expired
  if (new Date(room.expires_at) < new Date()) {
    const error = new Error("This quiz has expired");
    error.statusCode = 400;
    throw error;
  }

  // Check if quiz has ended
  if (room.status === "ended") {
    const error = new Error("This quiz has ended");
    error.statusCode = 400;
    throw error;
  }

  // For class quizzes, verify student is from same school
  if (room.quiz_type === "class" && user.school_id !== room.school_id) {
    const error = new Error("You are not authorized to join this quiz");
    error.status = 403;
    throw error;
  }

  // Get questions without correct answers
  const questions = await quizRepository.getQuizQuestions(room.id);

  return {
    room: {
      id: room.id,
      room_code: room.room_code,
      quiz_type: room.quiz_type,
      status: room.status,
      starts_at: room.starts_at,
      expires_at: room.expires_at,
    },
    questions,
  };
};

/**
 * Start quiz room - change status to 'live'
 * @param {number} room_id - Quiz room ID
 * @param {number} teacher_id - Teacher ID
 * @returns {Promise<Object>} Updated room
 */
const startRoom = async (room_id, teacher_id) => {
  // Get room and verify teacher owns it
  const room = await quizRepository.getRoomById(room_id);

  if (!room) {
    const error = new Error("Room not found");
    error.status = 404;
    throw error;
  }

  if (room.created_by !== teacher_id) {
    const error = new Error("You are not authorized to start this quiz");
    error.status = 403;
    throw error;
  }

  // Update status to 'live'
  const updated = await quizRepository.updateRoomStatus(room_id, "live");
  return updated;
};

/**
 * Normalize an answer to a lowercase letter (a-d) for comparison
 * Accepts a stored letter ('A'-'D' or 'a'-'d'), a numeric index (0-3),
 * or a numeric string. Returns null if it cannot be normalized.
 * @param {string|number|null|undefined} value
 * @returns {string|null} 'a' | 'b' | 'c' | 'd' | null
 */
const normalizeToLetter = (value) => {
  if (value === null || value === undefined) return null;

  // Numeric index (0-3) or numeric string ("0"-"3")
  if (typeof value === "number" || /^[0-9]+$/.test(String(value).trim())) {
    const idx = parseInt(value, 10);
    if (idx >= 0 && idx <= 3) return String.fromCharCode(97 + idx);
    return null;
  }

  // Letter form ('A'-'D' / 'a'-'d')
  const letter = String(value).trim().toLowerCase();
  if (["a", "b", "c", "d"].includes(letter)) return letter;
  return null;
};

/**
 * Submit quiz attempt — graded server-side
 * The client no longer computes the score; the backend compares the student's
 * answers against the quiz answer key and returns the correct answers for review.
 * @param {number} user_id - Student user ID
 * @param {string} room_code - Room code
 * @param {Array} answers - [{ question_id, selected_index?, selected_letter? }]
 * @returns {Promise<Object>} Computed score, total marks, rank, correct answers
 */
const submitAttempt = async (user_id, room_code, answers = []) => {
  // Get room by code
  const room = await quizRepository.getRoomByCode(room_code);

  if (!room) {
    const error = new Error("Room not found");
    error.status = 404;
    throw error;
  }

  // Verify quiz is live or hasn't expired
  if (room.status !== "live" && new Date(room.expires_at) < new Date()) {
    const error = new Error("Quiz is no longer active");
    error.status = 400;
    throw error;
  }

  // Fetch the answer key (server-side source of truth)
  const answerKey = await quizRepository.getQuizAnswerKey(room.id);
  const totalMarks = answerKey.length;

  // Map student's answers by question_id → normalized letter
  const submitted = Array.isArray(answers) ? answers : [];
  const answerByQuestion = new Map();
  submitted.forEach((a) => {
    const normalized =
      normalizeToLetter(a.selected_letter) ??
      normalizeToLetter(a.selected_index);
    answerByQuestion.set(Number(a.question_id), normalized);
  });

  // Grade: count correct; unanswered or mismatched = wrong
  let computedScore = 0;
  answerKey.forEach((q) => {
    const correctLetter = normalizeToLetter(q.correct_ans);
    const studentLetter = answerByQuestion.get(Number(q.id)) ?? null;
    if (correctLetter !== null && studentLetter === correctLetter) {
      computedScore += 1;
    }
  });

  // Submit the server-computed attempt
  const attempt = await quizRepository.submitAttempt(
    user_id,
    room.id,
    computedScore,
    totalMarks,
  );

  // Get results to find rank
  const results = await quizRepository.getRoomResults(room.id);
  const userResult = results.find((r) => r.user_id === user_id);

  return {
    score: attempt.score,
    total_marks: attempt.total_marks,
    rank: userResult?.rank ?? null,
    correct_answers: answerKey.map((q) => {
      const correctLetter = normalizeToLetter(q.correct_ans);
      return {
        question_id: q.id,
        correct_ans: q.correct_ans, // as stored (e.g. "A")
        correct_letter: correctLetter,
        correct_index:
          correctLetter !== null ? correctLetter.charCodeAt(0) - 97 : null,
      };
    }),
    results,
  };
};

/**
 * End quiz room - change status to 'ended'
 * @param {number} room_id - Quiz room ID
 * @param {number} teacher_id - Teacher ID
 * @returns {Promise<Object>} Updated room
 */
const endRoom = async (room_id, teacher_id) => {
  // Get room and verify teacher owns it
  const room = await quizRepository.getRoomById(room_id);

  if (!room) {
    const error = new Error("Room not found");
    error.status = 404;
    throw error;
  }

  if (room.created_by !== teacher_id) {
    const error = new Error("You are not authorized to end this quiz");
    error.status = 403;
    throw error;
  }

  // Update status to 'ended'
  const updated = await quizRepository.updateRoomStatus(room_id, "ended");
  return updated;
};

/**
 * Get quiz results with leaderboard
 * @param {string} room_code - Room code
 * @returns {Promise<Array>} Ranked results
 */
const getRoomResults = async (room_code) => {
  // Get room by code
  const room = await quizRepository.getRoomByCode(room_code);

  if (!room) {
    const error = new Error("Room not found");
    error.status = 404;
    throw error;
  }

  // Get results
  const results = await quizRepository.getRoomResults(room.id);
  return results;
};

/**
 * Get student's quiz history
 * @param {number} user_id - Student user ID
 * @returns {Promise<Array>} Quiz history
 */
const getMyQuizHistory = async (user_id) => {
  const history = await quizRepository.getStudentQuizHistory(user_id);
  return history;
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

const pool = require("../config/db");

/**
 * Get student's performance report grouped by chapters
 * Includes topic progress, practice results, and accuracy metrics
 * @param {number} user_id - Student user ID
 * @param {Array} chapter_ids - Array of chapter IDs to report on
 * @returns {Promise<Array>} Report grouped by chapter with topic details
 */
const getStudentReportByChapters = async (user_id, chapter_ids) => {
  const query = `
    SELECT 
      ch.id as chapter_id,
      ch.name as chapter_name,
      t.id as topic_id,
      t.name as topic_name,
      COALESCE(tp.play_count, 0) as play_count,
      COALESCE(pr.ans_correct, 0) as ans_correct,
      COALESCE(pr.ans_wrong, 0) as ans_wrong,
      ROUND(
        COALESCE(pr.ans_correct::float / NULLIF(pr.ans_correct + pr.ans_wrong, 0) * 100, 0)::numeric,
        1
      ) as accuracy
    FROM chapters ch
    LEFT JOIN topics t ON ch.id = t.chapter_id
    LEFT JOIN topic_progress tp ON tp.user_id = $1 AND tp.topic_id = t.id
    LEFT JOIN practice_results pr ON pr.user_id = $1 AND pr.topic_id = t.id
    WHERE ch.id = ANY($2::int[])
    ORDER BY ch.order_index, t.order_index;
  `;

  const result = await pool.query(query, [user_id, chapter_ids]);
  return result.rows;
};

/**
 * Get student's quiz performance summary
 * @param {number} user_id - Student user ID
 * @returns {Promise<Array>} Quiz summary with scores and percentages
 */
const getStudentQuizSummary = async (user_id) => {
  const query = `
    SELECT 
      qr.room_code,
      qr.quiz_type,
      qa.score,
      qa.total_marks,
      ROUND((qa.score::float / qa.total_marks * 100)::numeric, 1) as percentage,
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
  getStudentReportByChapters,
  getStudentQuizSummary,
};

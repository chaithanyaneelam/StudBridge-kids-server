const pool = require("../config/db");

/**
 * Upsert topic progress - increment play_count or create new record
 * Uses PostgreSQL ON CONFLICT to handle duplicate key
 * @param {number} user_id - User ID
 * @param {number} topic_id - Topic ID
 * @returns {Promise<Object>} Inserted/updated row
 */
const upsertTopicProgress = async (user_id, topic_id) => {
  const query = `
    INSERT INTO topic_progress (user_id, topic_id, play_count, last_played)
    VALUES ($1, $2, 1, CURRENT_DATE)
    ON CONFLICT (user_id, topic_id) 
    DO UPDATE SET 
      play_count = topic_progress.play_count + 1,
      last_played = CURRENT_DATE
    RETURNING *;
  `;

  const result = await pool.query(query, [user_id, topic_id]);
  return result.rows[0];
};

/**
 * Save practice quiz result for a topic
 * @param {number} user_id - User ID
 * @param {number} topic_id - Topic ID
 * @param {number} ans_correct - Number of correct answers
 * @param {number} ans_wrong - Number of wrong answers
 * @returns {Promise<Object>} Inserted row
 */
const savePracticeResult = async (
  user_id,
  topic_id,
  ans_correct,
  ans_wrong,
) => {
  const query = `
    INSERT INTO practice_results (user_id, topic_id, ans_correct, ans_wrong, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING *;
  `;

  const result = await pool.query(query, [
    user_id,
    topic_id,
    ans_correct,
    ans_wrong,
  ]);
  return result.rows[0];
};

/**
 * Get all progress records for a user with topic names
 * @param {number} user_id - User ID
 * @returns {Promise<Array>} Array of progress objects with topic details
 */
const getProgressByUser = async (user_id) => {
  const query = `
    SELECT 
      tp.topic_id,
      tp.play_count,
      tp.last_played,
      t.name AS topic_name,
      c.name AS chapter_name
    FROM topic_progress tp
    JOIN topics t ON t.id = tp.topic_id
    JOIN chapters ch ON ch.id = t.chapter_id
    JOIN classes c ON c.id = ch.class_id
    WHERE tp.user_id = $1
    ORDER BY tp.last_played DESC
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows;
};

module.exports = {
  upsertTopicProgress,
  savePracticeResult,
  getProgressByUser,
};

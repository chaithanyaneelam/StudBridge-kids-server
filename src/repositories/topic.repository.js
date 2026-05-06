const pool = require("../config/db");

/**
 * Fetch entire syllabus: chapters with their topics for a given class and board
 * Returns flat rows that will be grouped by service into nested JSON
 * @param {number} class_id - Class ID
 * @param {number} board_id - Board ID
 * @returns {Promise<Array>} Array of chapter and topic rows
 */
const getSyllabus = async (class_id, board_id) => {
  const query = `
    SELECT 
      c.id as chapter_id,
      c.name as chapter_name,
      c.order_index as chapter_order,
      t.id as topic_id,
      t.name as topic_name,
      t.explanation,
      t.game_url,
      t.order_index as topic_order
    FROM chapters c
    LEFT JOIN topics t ON c.id = t.chapter_id
    WHERE c.class_id = $1 AND c.board_id = $2
    ORDER BY c.order_index ASC, t.order_index ASC;
  `;

  const result = await pool.query(query, [
    parseInt(class_id),
    parseInt(board_id),
  ]);
  // Return empty array if no chapters exist (safe for frontend)
  return result.rows || [];
};

/**
 * Fetch only chapters for a given class and board (no topics)
 * @param {number} class_id - Class ID
 * @param {number} board_id - Board ID
 * @returns {Promise<Array>} Array of chapter objects
 */
const getChaptersByClass = async (class_id, board_id) => {
  const query = `
    SELECT id, name, order_index
    FROM chapters
    WHERE class_id = $1 AND board_id = $2
    ORDER BY order_index ASC;
  `;

  const result = await pool.query(query, [class_id, board_id]);
  return result.rows;
};

/**
 * Fetch all topics for a single chapter
 * @param {number} chapter_id - Chapter ID
 * @returns {Promise<Array>} Array of topic objects
 */
const getTopicsByChapter = async (chapter_id) => {
  const query = `
    SELECT id, name, explanation, game_url, order_index
    FROM topics
    WHERE chapter_id = $1
    ORDER BY order_index ASC;
  `;

  const result = await pool.query(query, [chapter_id]);
  return result.rows;
};

module.exports = {
  getSyllabus,
  getChaptersByClass,
  getTopicsByChapter,
};

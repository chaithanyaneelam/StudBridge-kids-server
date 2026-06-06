const pool = require("../config/db");

/**
 * Create a new chapter (curriculum section)
 * @param {number} class_id - Class ID
 * @param {number} board_id - Board ID
 * @param {string} name - Chapter name
 * @param {number} order_index - Display order within the class
 * @returns {Promise<Object>} Created chapter object
 */
const createChapter = async (class_id, board_id, name, order_index) => {
  const query = `
    INSERT INTO chapters (class_id, board_id, name, order_index)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  const result = await pool.query(query, [
    class_id,
    board_id,
    name,
    order_index,
  ]);
  return result.rows[0];
};

/**
 * Fetch all chapters for a class and board, ordered by display order
 * @param {number} class_id - Class ID
 * @param {number} board_id - Board ID
 * @returns {Promise<Array>} Array of chapter objects
 */
const getChaptersByClassAndBoard = async (class_id, board_id) => {
  const query = `
    SELECT id, name, class_id, board_id, order_index
    FROM chapters
    WHERE class_id = $1 AND board_id = $2
    ORDER BY order_index ASC;
  `;

  const result = await pool.query(query, [class_id, board_id]);

  // If no chapters for this board, return all chapters for the class
  // (platform quiz UI may request a default board_id that has no content)
  if (result.rows.length === 0) {
    const fallbackQuery = `
      SELECT id, name, class_id, board_id, order_index
      FROM chapters
      WHERE class_id = $1
      ORDER BY order_index ASC;
    `;
    const fallback = await pool.query(fallbackQuery, [class_id]);
    return fallback.rows;
  }

  return result.rows;
};

/**
 * Create a new topic within a chapter
 * @param {number} chapter_id - Chapter ID
 * @param {string} name - Topic name
 * @param {string} explanation - Topic explanation text
 * @param {string} game_url - URL to game/practice content
 * @param {number} order_index - Display order within chapter
 * @returns {Promise<Object>} Created topic object
 */
const createTopic = async (
  chapter_id,
  name,
  explanation,
  game_url,
  order_index,
) => {
  const query = `
    INSERT INTO topics (chapter_id, name, explanation, game_url, order_index)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const result = await pool.query(query, [
    chapter_id,
    name,
    explanation || null,
    game_url,
    order_index,
  ]);

  return result.rows[0];
};

/**
 * Fetch all topics for a chapter, ordered by display order
 * @param {number} chapter_id - Chapter ID
 * @returns {Promise<Array>} Array of topic objects
 */
const getTopicsByChapter = async (chapter_id) => {
  const query = `
    SELECT * FROM topics
    WHERE chapter_id = $1
    ORDER BY order_index ASC;
  `;

  const result = await pool.query(query, [chapter_id]);
  return result.rows;
};

/**
 * Update topic fields by ID
 * @param {number} id - Topic ID
 * @param {Object} data - Fields to update (name, explanation, game_url, order_index)
 * @returns {Promise<Object>} Updated topic object
 */
const updateTopic = async (id, data) => {
  const { name, explanation, game_url, order_index } = data;

  const query = `
    UPDATE topics
    SET
      name = COALESCE($2, name),
      explanation = COALESCE($3, explanation),
      game_url = COALESCE($4, game_url),
      order_index = COALESCE($5, order_index),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [
    id,
    name || null,
    explanation || null,
    game_url || null,
    order_index || null,
  ]);

  return result.rows[0];
};

/**
 * Delete a topic by ID
 * @param {number} id - Topic ID
 * @returns {Promise<Object>} Deleted topic object
 */
const deleteTopic = async (id) => {
  const query = "DELETE FROM topics WHERE id = $1 RETURNING *;";
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

/**
 * Update chapter fields by ID
 * @param {number} id - Chapter ID
 * @param {Object} data - Fields to update (name, order_index)
 * @returns {Promise<Object>} Updated chapter object
 */
const updateChapter = async (id, data) => {
  const { name, order_index } = data;

  const query = `
    UPDATE chapters
    SET
      name = COALESCE($2, name),
      order_index = COALESCE($3, order_index),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [
    id,
    name || null,
    order_index || null,
  ]);
  return result.rows[0];
};

/**
 * Delete a chapter by ID (cascades to topics via foreign key)
 * @param {number} id - Chapter ID
 * @returns {Promise<Object>} Deleted chapter object
 */
const deleteChapter = async (id) => {
  const query = "DELETE FROM chapters WHERE id = $1 RETURNING *;";
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  createChapter,
  getChaptersByClassAndBoard,
  createTopic,
  getTopicsByChapter,
  updateTopic,
  deleteTopic,
  updateChapter,
  deleteChapter,
};

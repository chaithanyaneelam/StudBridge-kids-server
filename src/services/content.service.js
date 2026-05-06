const schoolRepository = require("../repositories/school.repository");
const contentRepository = require("../repositories/content.repository");

/**
 * Create a new school
 * @param {Object} data - School data (validated by Zod)
 * @returns {Promise<Object>} Created school
 */
const createSchool = async (data) => {
  const school = await schoolRepository.createSchool(data);
  return school;
};

/**
 * Get all schools
 * @returns {Promise<Array>} Array of all schools
 */
const getAllSchools = async () => {
  const schools = await schoolRepository.getAllSchools();
  return schools;
};

/**
 * Create a new chapter for a class and board
 * @param {Object} data - Chapter data with class_id, board_id, name, order_index (validated)
 * @returns {Promise<Object>} Created chapter
 */
const createChapter = async (data) => {
  const chapter = await contentRepository.createChapter(
    data.class_id,
    data.board_id,
    data.name,
    data.order_index,
  );
  return chapter;
};

/**
 * Get all chapters for a class and board
 * @param {number} class_id - Class ID
 * @param {number} board_id - Board ID
 * @returns {Promise<Array>} Array of chapters
 */
const getAllChapters = async (class_id, board_id) => {
  const chapters = await contentRepository.getChaptersByClassAndBoard(
    class_id,
    board_id,
  );
  return chapters;
};

/**
 * Create a new topic within a chapter
 * @param {Object} data - Topic data (chapter_id, name, explanation, game_url, order_index)
 * @returns {Promise<Object>} Created topic
 */
const createTopic = async (data) => {
  const topic = await contentRepository.createTopic(
    data.chapter_id,
    data.name,
    data.explanation,
    data.game_url,
    data.order_index,
  );
  return topic;
};

/**
 * Get all topics for a chapter
 * @param {number} chapter_id - Chapter ID
 * @returns {Promise<Array>} Array of topics
 */
const getAllTopics = async (chapter_id) => {
  const topics = await contentRepository.getTopicsByChapter(chapter_id);
  return topics;
};

/**
 * Update a topic
 * @param {number} id - Topic ID
 * @param {Object} data - Fields to update (name, explanation, game_url, order_index)
 * @returns {Promise<Object>} Updated topic
 */
const updateTopic = async (id, data) => {
  const topic = await contentRepository.updateTopic(id, data);
  return topic;
};

/**
 * Delete a topic
 * @param {number} id - Topic ID
 * @returns {Promise<Object>} Deleted topic
 */
const deleteTopic = async (id) => {
  const topic = await contentRepository.deleteTopic(id);
  return topic;
};

/**
 * Update a chapter
 * @param {number} id - Chapter ID
 * @param {Object} data - Fields to update (name, order_index)
 * @returns {Promise<Object>} Updated chapter
 */
const updateChapter = async (id, data) => {
  const chapter = await contentRepository.updateChapter(id, data);
  return chapter;
};

/**
 * Delete a chapter (cascades to topics)
 * @param {number} id - Chapter ID
 * @returns {Promise<Object>} Deleted chapter
 */
const deleteChapter = async (id) => {
  const chapter = await contentRepository.deleteChapter(id);
  return chapter;
};

module.exports = {
  createSchool,
  getAllSchools,
  createChapter,
  getAllChapters,
  createTopic,
  getAllTopics,
  updateTopic,
  deleteTopic,
  updateChapter,
  deleteChapter,
};

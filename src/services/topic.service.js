const topicRepository = require("../repositories/topic.repository");

/**
 * Get nested syllabus structure - called once when student logs in
 * Groups flat SQL rows into hierarchical JSON with chapters containing topics
 * @param {number} class_id - Student's class ID
 * @param {number} board_id - Student's board ID
 * @returns {Promise<Array>} Nested array of chapters with topics
 */
const getSyllabus = async (class_id, board_id) => {
  // Fetch flat rows from repository
  const rows = await topicRepository.getSyllabus(class_id, board_id);

  if (!rows || rows.length === 0) {
    return [];
  }

  // Group flat rows into nested structure
  const chapterMap = new Map();

  rows.forEach((row) => {
    // If chapter not yet in map, add it
    if (!chapterMap.has(row.chapter_id)) {
      chapterMap.set(row.chapter_id, {
        id: row.chapter_id,
        name: row.chapter_name,
        topics: [],
      });
    }

    // If topic exists (some rows may have null topic_id if chapter has no topics)
    if (row.topic_id) {
      chapterMap.get(row.chapter_id).topics.push({
        id: row.topic_id,
        name: row.topic_name,
        explanation: row.explanation,
        game_url: row.game_url,
      });
    }
  });

  // Convert map to array and maintain order
  return Array.from(chapterMap.values());
};

module.exports = {
  getSyllabus,
};

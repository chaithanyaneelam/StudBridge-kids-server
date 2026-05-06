const reportRepository = require("../repositories/report.repository");

/**
 * Generate comprehensive student report
 * Groups chapters with topics and classifies performance
 * Combines topic breakdown and quiz summary
 * @param {number} user_id - Student user ID
 * @param {Array} chapter_ids - Array of chapter IDs
 * @returns {Promise<Object>} Complete report object
 */
const generateReport = async (user_id, chapter_ids) => {
  // Fetch data in parallel
  const [chapterData, quizSummary] = await Promise.all([
    reportRepository.getStudentReportByChapters(user_id, chapter_ids),
    reportRepository.getStudentQuizSummary(user_id),
  ]);

  // Group by chapter and classify topics
  const chaptersMap = {};

  chapterData.forEach((row) => {
    // Initialize chapter if not exists
    if (!chaptersMap[row.chapter_id]) {
      chaptersMap[row.chapter_id] = {
        chapter_id: row.chapter_id,
        chapter_name: row.chapter_name,
        topics: [],
      };
    }

    // Only add topic if it exists
    if (row.topic_id) {
      // Classify topic performance
      let performance_level;

      if (row.play_count === 0) {
        performance_level = "Not Attempted";
      } else if (row.play_count < 3) {
        performance_level = "Needs Practice";
      } else if (row.accuracy === null) {
        performance_level = "Needs Practice"; // has plays but no accuracy
      } else if (row.accuracy < 60) {
        performance_level = "Weak";
      } else if (row.accuracy >= 60 && row.accuracy <= 80) {
        performance_level = "Average";
      } else {
        performance_level = "Strong";
      }

      chaptersMap[row.chapter_id].topics.push({
        topic_id: row.topic_id,
        topic_name: row.topic_name,
        play_count: row.play_count,
        ans_correct: row.ans_correct,
        ans_wrong: row.ans_wrong,
        accuracy: row.accuracy,
        performance_level,
      });
    }
  });

  // Convert map to array
  const chapterBreakdown = Object.values(chaptersMap);

  // Build final report
  const report = {
    generated_at: new Date().toISOString(),
    chapter_breakdown: chapterBreakdown,
    quiz_summary: quizSummary,
    summary_stats: {
      total_chapters: chapterBreakdown.length,
      total_topics: chapterBreakdown.reduce(
        (sum, ch) => sum + ch.topics.length,
        0,
      ),
      total_quizzes_attempted: quizSummary.length,
      average_quiz_score:
        quizSummary.length > 0
          ? (
              quizSummary.reduce((sum, q) => sum + q.percentage, 0) /
              quizSummary.length
            ).toFixed(1)
          : 0,
    },
  };

  return report;
};

module.exports = {
  generateReport,
};

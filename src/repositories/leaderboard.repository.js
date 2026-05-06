const pool = require("../config/db");

/**
 * Get global leaderboard - top 50 students across all schools for a given class
 * Combines quiz scores (70%), practice accuracy (20%), and topics completed (10%)
 * @param {number} class_id - Class ID
 * @returns {Promise<Array>} Top 50 students with rank and scores
 */
const getGlobalLeaderboard = async (class_id) => {
  const query = `
    SELECT *, RANK() OVER (ORDER BY total_score DESC) as rank
    FROM (
      SELECT 
        u.id,
        u.fullname,
        s.name as school_name,
        ROUND((
          COALESCE(AVG(qa.score::float / NULLIF(qa.total_marks, 0) * 100), 0) * 0.7 +
          COALESCE(AVG(pr.ans_correct::float / NULLIF(pr.ans_correct + pr.ans_wrong, 0) * 100), 0) * 0.2 +
          COALESCE(COUNT(DISTINCT tp.topic_id)::float, 0) * 0.1
        )::numeric, 2) AS total_score
      FROM users u
      JOIN schools s ON s.id = u.school_id
      LEFT JOIN quiz_attempts qa ON qa.user_id = u.id
      LEFT JOIN practice_results pr ON pr.user_id = u.id
      LEFT JOIN topic_progress tp ON tp.user_id = u.id
      WHERE u.class_id = $1 AND u.role = 'student'
      GROUP BY u.id, u.fullname, s.name
    ) ranked
    ORDER BY total_score DESC
    LIMIT 50;
  `;

  const result = await pool.query(query, [class_id]);
  return result.rows;
};

/**
 * Get school leaderboard - top 50 students for a given class within a specific school
 * @param {number} class_id - Class ID
 * @param {number} school_id - School ID
 * @returns {Promise<Array>} Top 50 students from school with rank and scores
 */
const getSchoolLeaderboard = async (class_id, school_id) => {
  const query = `
    SELECT *, RANK() OVER (ORDER BY total_score DESC) as rank
    FROM (
      SELECT 
        u.id,
        u.fullname,
        s.name as school_name,
        ROUND((
          COALESCE(AVG(qa.score::float / NULLIF(qa.total_marks, 0) * 100), 0) * 0.7 +
          COALESCE(AVG(pr.ans_correct::float / NULLIF(pr.ans_correct + pr.ans_wrong, 0) * 100), 0) * 0.2 +
          COALESCE(COUNT(DISTINCT tp.topic_id)::float, 0) * 0.1
        )::numeric, 2) AS total_score
      FROM users u
      JOIN schools s ON s.id = u.school_id
      LEFT JOIN quiz_attempts qa ON qa.user_id = u.id
      LEFT JOIN practice_results pr ON pr.user_id = u.id
      LEFT JOIN topic_progress tp ON tp.user_id = u.id
      WHERE u.class_id = $1 AND u.school_id = $2 AND u.role = 'student'
      GROUP BY u.id, u.fullname, s.name
    ) ranked
    ORDER BY total_score DESC
    LIMIT 50;
  `;

  const result = await pool.query(query, [class_id, school_id]);
  return result.rows;
};

/**
 * Get student's rank in both global and school leaderboards
 * @param {number} user_id - User ID
 * @param {number} class_id - Class ID
 * @param {number} school_id - School ID
 * @returns {Promise<Object>} Student's global and school rank with score
 */
const getStudentRank = async (user_id, class_id, school_id) => {
  const query = `
    WITH global_ranks AS (
      SELECT 
        u.id,
        RANK() OVER (ORDER BY 
          (COALESCE(AVG(qa.score::float / NULLIF(qa.total_marks, 0) * 100), 0) * 0.7) +
          (COALESCE(AVG(pr.ans_correct::float / NULLIF(pr.ans_correct + pr.ans_wrong, 0) * 100), 0) * 0.2) +
          (COALESCE(COUNT(DISTINCT tp.topic_id), 0) * 0.1) DESC
        ) as global_rank,
        ROUND(
          ((COALESCE(AVG(qa.score::float / NULLIF(qa.total_marks, 0) * 100), 0) * 0.7) +
          (COALESCE(AVG(pr.ans_correct::float / NULLIF(pr.ans_correct + pr.ans_wrong, 0) * 100), 0) * 0.2) +
          (COALESCE(COUNT(DISTINCT tp.topic_id), 0) * 0.1))::numeric, 2
        ) as total_score
      FROM users u
      LEFT JOIN quiz_attempts qa ON u.id = qa.user_id
      LEFT JOIN practice_results pr ON u.id = pr.user_id
      LEFT JOIN topic_progress tp ON u.id = tp.user_id
      WHERE u.class_id = $2 AND u.role = 'student'
      GROUP BY u.id
    ),
    school_ranks AS (
      SELECT 
        u.id,
        RANK() OVER (ORDER BY 
          (COALESCE(AVG(qa.score::float / NULLIF(qa.total_marks, 0) * 100), 0) * 0.7) +
          (COALESCE(AVG(pr.ans_correct::float / NULLIF(pr.ans_correct + pr.ans_wrong, 0) * 100), 0) * 0.2) +
          (COALESCE(COUNT(DISTINCT tp.topic_id), 0) * 0.1) DESC
        ) as school_rank
      FROM users u
      LEFT JOIN quiz_attempts qa ON u.id = qa.user_id
      LEFT JOIN practice_results pr ON u.id = pr.user_id
      LEFT JOIN topic_progress tp ON u.id = tp.user_id
      WHERE u.class_id = $2 AND u.school_id = $3 AND u.role = 'student'
      GROUP BY u.id
    )
    SELECT 
      gr.global_rank,
      sr.school_rank,
      gr.total_score
    FROM global_ranks gr
    JOIN school_ranks sr ON gr.id = sr.id
    WHERE gr.id = $1;
  `;

  const result = await pool.query(query, [user_id, class_id, school_id]);
  return result.rows[0] || null;
};

module.exports = {
  getGlobalLeaderboard,
  getSchoolLeaderboard,
  getStudentRank,
};

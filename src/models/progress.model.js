/**
 * Progress Model
 * Tracks a student's learning progress on topics and quizzes
 *
 * Table: progress
 * Fields:
 * - id: Primary key
 * - user_id: Reference to student user
 * - topic_id: Reference to topic/chapter
 * - quiz_id: Reference to quiz (if applicable)
 * - score: Score obtained
 * - max_score: Maximum possible score
 * - attempts: Number of attempts made
 * - completion_status: Not Started, In Progress, Completed
 * - time_spent_seconds: Total time spent on this topic
 * - last_accessed: Timestamp of last access
 * - created_at: Record creation timestamp
 * - updated_at: Record update timestamp
 */

// This file serves as documentation for the progress table structure
// Database queries should be handled via repositories/progress.repository.js

module.exports = {};

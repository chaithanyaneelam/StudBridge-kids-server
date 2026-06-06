const { z } = require("zod");

/**
 * Schema for recording when student opens a topic
 */
const topicOpenSchema = z.object({
  topic_id: z
    .number()
    .int("Topic ID must be an integer")
    .positive("Topic ID must be positive"),
});

/**
 * Schema for recording practice quiz results
 */
const practiceResultSchema = z.object({
  topic_id: z
    .number()
    .int("Topic ID must be an integer")
    .positive("Topic ID must be positive"),
  ans_correct: z
    .number()
    .int("ans_correct must be an integer")
    .nonnegative("ans_correct must be non-negative"),
  ans_wrong: z
    .number()
    .int("ans_wrong must be an integer")
    .nonnegative("ans_wrong must be non-negative"),
});

module.exports = {
  topicOpenSchema,
  practiceResultSchema,
};

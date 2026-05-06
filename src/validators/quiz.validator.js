const { z } = require("zod");

/**
 * Schema for creating a platform quiz (by admin)
 */
const createPlatformQuizSchema = z.object({
  starts_at: z.string().datetime("Invalid datetime format"),
  class_id: z.number().int().positive("Class ID must be positive"),
  chapter_id: z.number().int().positive("Chapter ID must be positive"),
  topic_id: z.number().int().positive("Topic ID must be positive").optional(),
  question_limit: z
    .number()
    .int()
    .positive("Question limit must be positive")
    .default(10),
});

/**
 * Schema for creating a class quiz (by teacher)
 */
const createClassQuizSchema = z.object({
  starts_at: z.string().datetime("Invalid datetime format"),
  class_id: z.number().int().positive("Class ID must be positive"),
  chapter_id: z.number().int().positive("Chapter ID must be positive"),
  topic_id: z.number().int().positive("Topic ID must be positive").optional(),
  question_limit: z
    .number()
    .int()
    .positive("Question limit must be positive")
    .default(10),
});

/**
 * Schema for joining a quiz room
 */
const joinRoomSchema = z.object({
  room_code: z
    .string()
    .min(6, "Room code must be at least 6 characters")
    .max(8, "Room code must be at most 8 characters"),
});

/**
 * Schema for submitting quiz attempt
 */
const submitAttemptSchema = z.object({
  room_code: z.string().min(1, "Room code is required"),
  score: z.number().min(0, "Score cannot be negative"),
  total_marks: z.number().min(1, "Total marks must be at least 1"),
});

module.exports = {
  createPlatformQuizSchema,
  createClassQuizSchema,
  joinRoomSchema,
  submitAttemptSchema,
};

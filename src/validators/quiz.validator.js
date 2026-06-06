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
  answers: z
    .array(
      z.object({
        question_id: z.coerce.number().int().positive(),
        selected_index: z.number().int().min(0).max(3).nullable().optional(),
        selected_letter: z
          .string()
          .toLowerCase()
          .pipe(z.enum(["a", "b", "c", "d"]))
          .nullable()
          .optional(),
      }),
    )
    .optional(),
  score: z.number().min(0).optional(),
  total_marks: z.number().min(1).optional(),
});

module.exports = {
  createPlatformQuizSchema,
  createClassQuizSchema,
  joinRoomSchema,
  submitAttemptSchema,
};

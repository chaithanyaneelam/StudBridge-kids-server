const { z } = require("zod");

/**
 * Zod schema for school creation and updates
 */
const schoolSchema = z.object({
  name: z
    .string()
    .min(2, "School name must be at least 2 characters")
    .max(255, "School name must not exceed 255 characters"),
  city: z
    .string()
    .max(100, "City must not exceed 100 characters")
    .optional()
    .or(z.literal("")),
  contact_person: z
    .string()
    .max(100, "Contact person must not exceed 100 characters")
    .optional()
    .or(z.literal("")),
  contact_phone: z
    .string()
    .max(20, "Contact phone must not exceed 20 characters")
    .optional()
    .or(z.literal("")),
  head_count: z
    .number()
    .int("Head count must be an integer")
    .nonnegative("Head count must be non-negative")
    .optional(),
  per_head_fee: z.number().positive("Per head fee must be positive").optional(),
});

/**
 * Zod schema for chapter creation and updates
 */
const chapterSchema = z.object({
  class_id: z
    .number()
    .int("Class ID must be an integer")
    .positive("Class ID must be positive"),
  board_id: z
    .number()
    .int("Board ID must be an integer")
    .positive("Board ID must be positive"),
  name: z
    .string()
    .min(2, "Chapter name must be at least 2 characters")
    .max(255, "Chapter name must not exceed 255 characters"),
  order_index: z
    .number()
    .int("Order index must be an integer")
    .nonnegative("Order index must be non-negative"),
});

/**
 * Zod schema for topic creation and updates
 */
const topicSchema = z.object({
  chapter_id: z
    .number()
    .int("Chapter ID must be an integer")
    .positive("Chapter ID must be positive"),
  name: z
    .string()
    .min(2, "Topic name must be at least 2 characters")
    .max(255, "Topic name must not exceed 255 characters"),
  explanation: z
    .string()
    .max(5000, "Explanation must not exceed 5000 characters")
    .optional()
    .or(z.literal("")),
  game_url: z
    .string()
    .min(5, "Game URL must be at least 5 characters")
    .max(500, "Game URL must not exceed 500 characters"),
  order_index: z
    .number()
    .int("Order index must be an integer")
    .nonnegative("Order index must be non-negative"),
});

module.exports = {
  schoolSchema,
  chapterSchema,
  topicSchema,
};

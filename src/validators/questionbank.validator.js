const { z } = require("zod");

/**
 * Question validation schema
 * Validates all required fields for adding a question to the bank
 */
const questionSchema = z.object({
  topic_id: z.number().int().positive("Topic ID must be a positive number"),
  question: z.string().min(5, "Question must be at least 5 characters"),
  option_a: z.string().min(1, "Option A is required"),
  option_b: z.string().min(1, "Option B is required"),
  option_c: z.string().min(1, "Option C is required"),
  option_d: z.string().min(1, "Option D is required"),
  correct_ans: z.enum(["A", "B", "C", "D"], {
    errorMap: () => ({ message: "Correct answer must be A, B, C, or D" }),
  }),
  difficulty: z
    .enum(["easy", "medium", "hard"], {
      errorMap: () => ({
        message: "Difficulty must be easy, medium, or hard",
      }),
    })
    .default("medium"),
  marks: z.number().int().positive("Marks must be positive").default(1),
});

module.exports = {
  questionSchema,
};

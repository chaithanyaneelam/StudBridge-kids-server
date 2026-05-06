const { z } = require("zod");

/**
 * Report generation validation schema
 * Requires at least one chapter ID
 */
const reportSchema = z.object({
  chapter_ids: z
    .array(z.number().int().positive("Chapter ID must be positive"))
    .min(1, "At least one chapter ID is required"),
});

module.exports = {
  reportSchema,
};

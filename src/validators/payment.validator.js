const { z } = require("zod");

const initiatePaymentSchema = z.object({
  plan: z.enum(["monthly", "6month", "yearly"], {
    errorMap: () => ({ message: "Plan must be monthly, 6month, or yearly" }),
  }),
  mobile: z.string().min(10).max(15).optional(),
});

module.exports = { initiatePaymentSchema };

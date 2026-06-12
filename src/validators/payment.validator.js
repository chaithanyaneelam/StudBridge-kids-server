const { z } = require("zod");

const initiatePaymentSchema = z.object({
  plan: z.enum(["monthly", "6month", "yearly"], {
    errorMap: () => ({ message: "Plan must be monthly, 6month, or yearly" }),
  }),
  mobile: z.string().min(10).max(15).optional(),
});

const initiateUpiIntentSchema = z.object({
  plan: z.enum(["monthly", "6month", "yearly"], {
    errorMap: () => ({ message: "Plan must be monthly, 6month, or yearly" }),
  }),
  // Helps PhonePe shape the UPI intent for the device opening it.
  deviceOS: z.enum(["ANDROID", "IOS"]).optional(),
  // Optional: target a single UPI app package (e.g. "com.phonepe.app").
  // Omit to get a generic intent that lets the user pick any UPI app.
  targetApp: z.string().min(1).max(64).optional(),
});

module.exports = { initiatePaymentSchema, initiateUpiIntentSchema };

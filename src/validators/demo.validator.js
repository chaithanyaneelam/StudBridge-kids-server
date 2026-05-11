const { z } = require("zod");

const bookingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  school_name: z.string().optional(),
  city: z.string().optional(),
  student_count: z.string().optional(),
  message: z.string().optional(),
  booking_type: z.enum(["school", "individual"]).default("school"),
});

const updateStatusSchema = z.object({
  status: z.enum(["pending", "contacted", "closed"]),
});

module.exports = { bookingSchema, updateStatusSchema };

const demoService = require("../services/demo.service");
const {
  bookingSchema,
  updateStatusSchema,
} = require("../validators/demo.validator");

// Public — anyone can book a demo
const bookDemo = async (req, res, next) => {
  try {
    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        fields: parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    const booking = await demoService.createBooking(parsed.data);
    res.status(201).json({
      message: "Demo booked successfully! We will contact you within 24 hours.",
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};

// Admin only — get all bookings with optional status filter
const getBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const bookings = await demoService.getAllBookings(status);
    res.status(200).json({ data: bookings });
  } catch (err) {
    next(err);
  }
};

// Admin only — update booking status
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    const booking = await demoService.updateStatus(
      parseInt(id),
      parsed.data.status,
    );
    res.status(200).json({ data: booking });
  } catch (err) {
    next(err);
  }
};

// Admin only — get stats
const getStats = async (req, res, next) => {
  try {
    const stats = await demoService.getStats();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = { bookDemo, getBookings, updateStatus, getStats };

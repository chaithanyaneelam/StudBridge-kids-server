const demoRepository = require("../repositories/demo.repository");

// Create booking — public route no auth needed
const createBooking = async (data) => {
  const booking = await demoRepository.createBooking(data);
  return booking;
};

// Get all bookings — admin only
const getAllBookings = async (status) => {
  return await demoRepository.getAllBookings(status);
};

// Update status — admin only
const updateStatus = async (id, status) => {
  const booking = await demoRepository.updateBookingStatus(id, status);
  if (!booking) {
    const err = new Error("Booking not found");
    err.status = 404;
    throw err;
  }
  return booking;
};

// Get stats — admin only
const getStats = async () => {
  return await demoRepository.getBookingStats();
};

module.exports = { createBooking, getAllBookings, updateStatus, getStats };

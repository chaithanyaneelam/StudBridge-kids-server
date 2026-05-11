const pool = require("../config/db");

// Create a new demo booking
const createBooking = async (data) => {
  const query = `
    INSERT INTO demo_bookings
    (name, email, phone, school_name, city, student_count, message, booking_type)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, name, email, booking_type, created_at
  `;
  const result = await pool.query(query, [
    data.name,
    data.email,
    data.phone,
    data.school_name || null,
    data.city || null,
    data.student_count || null,
    data.message || null,
    data.booking_type || "school",
  ]);
  return result.rows[0];
};

// Get all bookings — admin only
const getAllBookings = async (status) => {
  const query = status
    ? `SELECT * FROM demo_bookings WHERE status = $1 ORDER BY created_at DESC`
    : `SELECT * FROM demo_bookings ORDER BY created_at DESC`;
  const result = await pool.query(query, status ? [status] : []);
  return result.rows;
};

// Update booking status — admin only
const updateBookingStatus = async (id, status) => {
  const query = `
    UPDATE demo_bookings SET status = $2 WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id, status]);
  return result.rows[0];
};

// Get booking counts for admin overview
const getBookingStats = async () => {
  const query = `
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'contacted') AS contacted,
      COUNT(*) FILTER (WHERE status = 'closed') AS closed,
      COUNT(*) AS total
    FROM demo_bookings
  `;
  const result = await pool.query(query);
  return result.rows[0];
};

module.exports = {
  createBooking,
  getAllBookings,
  updateBookingStatus,
  getBookingStats,
};

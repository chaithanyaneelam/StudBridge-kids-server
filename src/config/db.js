// All queries use parameterized inputs ($1, $2...) via pg pool
// This fully prevents SQL injection attacks at the driver level

const { Pool } = require("pg");

/**
 * PostgreSQL Connection Pool
 * Initializes a connection pool using the DATABASE_URL environment variable.
 * Maximum of 10 connections to prevent resource exhaustion.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log successful connection
pool.on("connect", () => {
  console.log("✓ PostgreSQL connection established");
});

// Handle connection errors
pool.on("error", (err) => {
  console.error("✗ Unexpected error on idle client:", err);
  process.exit(1);
});

// Test the connection on startup
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("✗ Failed to connect to database:", err.message);
    process.exit(1);
  } else {
    console.log("✓ Database connection successful");
  }
});

module.exports = pool;

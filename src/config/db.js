// All queries use parameterized inputs ($1, $2...) via pg pool
// This fully prevents SQL injection attacks at the driver level

const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "✗ DATABASE_URL is not set. On Render, add it under Environment — .env is not deployed.",
  );
  process.exit(1);
}

// Supabase and other hosted Postgres require SSL from external servers (e.g. Render)
const needsSsl =
  process.env.PGSSLMODE === "require" ||
  /supabase\.com|pooler\.supabase/i.test(databaseUrl);

/**
 * PostgreSQL Connection Pool
 * Initializes a connection pool using the DATABASE_URL environment variable.
 * Maximum of 10 connections to prevent resource exhaustion.
 */
const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  // Render cold starts + remote Supabase pooler can exceed 2s on first connect
  connectionTimeoutMillis: 15000,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

// Log successful connection
pool.on("connect", () => {
  console.log("✓ PostgreSQL connection established");
});

// Log idle-pool errors; do not exit — a single bad connection should not kill the server
pool.on("error", (err) => {
  console.error("✗ Unexpected error on idle client:", err.message);
});

// Test the connection on startup
pool.query("SELECT NOW()", (err) => {
  if (err) {
    console.error("✗ Failed to connect to database:", err.message);
    if (/timeout|terminated/i.test(err.message)) {
      console.error(
        "  Hint: confirm DATABASE_URL on Render, use Supabase pooler port 6543, and URL-encode @ in the password as %40.",
      );
    }
    process.exit(1);
  }
  console.log("✓ Database connection successful");
});

module.exports = pool;

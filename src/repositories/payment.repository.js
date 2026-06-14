const pool = require("../config/db");

// Create a pending payment record before initiating PhonePe
// razorpay_id column is reused to store the merchant order id (transaction id)
const createPaymentRecord = async (
  user_id,
  plan,
  amount,
  merchant_transaction_id,
) => {
  const query = `
    INSERT INTO subscriptions
    (user_id, plan, amount, razorpay_id, start_date, expiry_date)
    VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE)
    RETURNING *
  `;
  // start_date and expiry_date are placeholders until payment is confirmed
  const result = await pool.query(query, [
    user_id,
    plan,
    amount,
    merchant_transaction_id,
  ]);
  return result.rows[0];
};

// Update subscription after successful payment — activates the account.
// Plan durations: monthly = 1 month, 6month = 6 months, yearly = 12 months.
//
// The subscriptions update and the users update run in a single transaction so
// the account is never left half-activated (subscription dated but user not, or
// vice versa). The users.plan column stores the canonical 'paid' status flag;
// the specific tier (monthly/6month/yearly) remains on the subscriptions row.
const activateSubscription = async (
  merchant_transaction_id,
  phonepe_transaction_id,
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the pending subscription row so concurrent activations (webhook +
    // status poll) serialize. If it's already gone (a concurrent call won the
    // race and rewrote razorpay_id), treat this as an idempotent no-op rather
    // than an error.
    const getQuery = `
      SELECT * FROM subscriptions WHERE razorpay_id = $1 LIMIT 1 FOR UPDATE
    `;
    const existing = await client.query(getQuery, [merchant_transaction_id]);
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return { subscription: null, user: null, alreadyProcessed: true };
    }

    const sub = existing.rows[0];
    const plan = sub.plan;

    // Calculate expiry based on plan (integer derived internally — safe to inline)
    let monthsToAdd = 1;
    if (plan === "6month") monthsToAdd = 6;
    if (plan === "yearly") monthsToAdd = 12;

    // Update subscription with real dates and phonepe transaction id.
    // Rewriting razorpay_id to the PhonePe txn id also makes re-activation
    // idempotent: a later lookup by the merchant txn id returns nothing.
    const updateSubQuery = `
      UPDATE subscriptions
      SET
        start_date = CURRENT_DATE,
        expiry_date = CURRENT_DATE + INTERVAL '${monthsToAdd} months',
        razorpay_id = $2
      WHERE razorpay_id = $1
      RETURNING *
    `;
    const updatedSub = await client.query(updateSubQuery, [
      merchant_transaction_id,
      phonepe_transaction_id,
    ]);

    // Update user: canonical 'paid' status flag + expiry in users table
    const updateUserQuery = `
      UPDATE users
      SET
        plan = 'paid',
        plan_expiry = CURRENT_DATE + INTERVAL '${monthsToAdd} months'
      WHERE id = $1
      RETURNING id, fullname, email, plan, plan_expiry
    `;
    const updatedUser = await client.query(updateUserQuery, [sub.user_id]);

    await client.query("COMMIT");

    return {
      subscription: updatedSub.rows[0],
      user: updatedUser.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Mark payment as failed
const markPaymentFailed = async (merchant_transaction_id) => {
  const query = `
    UPDATE subscriptions
    SET razorpay_id = CONCAT(razorpay_id, '_FAILED')
    WHERE razorpay_id = $1
  `;
  await pool.query(query, [merchant_transaction_id]);
};

// Get subscription status for a user
const getUserSubscription = async (user_id) => {
  const query = `
    SELECT * FROM subscriptions
    WHERE user_id = $1
    ORDER BY start_date DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows[0] || null;
};

// Check if a merchant_transaction_id already exists to prevent duplicates
const findByMerchantTransactionId = async (merchant_transaction_id) => {
  const query = `
    SELECT * FROM subscriptions WHERE razorpay_id = $1 LIMIT 1
  `;
  const result = await pool.query(query, [merchant_transaction_id]);
  return result.rows[0] || null;
};

module.exports = {
  createPaymentRecord,
  activateSubscription,
  markPaymentFailed,
  getUserSubscription,
  findByMerchantTransactionId,
};

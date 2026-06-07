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

// Update subscription after successful payment — activates the account
// Plan durations: monthly = 1 month, 6month = 6 months, yearly = 12 months
const activateSubscription = async (
  merchant_transaction_id,
  phonepe_transaction_id,
) => {
  // First get the pending subscription to know the plan
  const getQuery = `
    SELECT * FROM subscriptions WHERE razorpay_id = $1 LIMIT 1
  `;
  const existing = await pool.query(getQuery, [merchant_transaction_id]);
  if (!existing.rows[0]) throw new Error("Subscription record not found");

  const sub = existing.rows[0];
  const plan = sub.plan;

  // Calculate expiry based on plan
  let monthsToAdd = 1;
  if (plan === "6month") monthsToAdd = 6;
  if (plan === "yearly") monthsToAdd = 12;

  // Update subscription with real dates and phonepe transaction id
  const updateSubQuery = `
    UPDATE subscriptions
    SET
      start_date = CURRENT_DATE,
      expiry_date = CURRENT_DATE + INTERVAL '${monthsToAdd} months',
      razorpay_id = $2
    WHERE razorpay_id = $1
    RETURNING *
  `;
  const updatedSub = await pool.query(updateSubQuery, [
    merchant_transaction_id,
    phonepe_transaction_id,
  ]);

  // Update user plan and expiry in users table
  const updateUserQuery = `
    UPDATE users
    SET
      plan = $1,
      plan_expiry = CURRENT_DATE + INTERVAL '${monthsToAdd} months'
    WHERE id = $2
    RETURNING id, fullname, email, plan, plan_expiry
  `;
  const updatedUser = await pool.query(updateUserQuery, [plan, sub.user_id]);

  return {
    subscription: updatedSub.rows[0],
    user: updatedUser.rows[0],
  };
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

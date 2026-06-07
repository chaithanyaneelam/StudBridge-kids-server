const {
  StandardCheckoutClient,
  Env,
  StandardCheckoutPayRequest,
} = require("@phonepe-pg/pg-sdk-node");
const paymentRepository = require("../repositories/payment.repository");
const phonePeConfig = require("../config/phonepe");

// Plan amounts in paise (PhonePe uses paise — multiply rupees by 100)
const PLAN_AMOUNTS = {
  monthly: 24900, // ₹249 in paise
  "6month": 69900, // ₹699 in paise
  yearly: 119900, // ₹1199 in paise
};

const PLAN_NAMES = {
  monthly: "Studbridge Kids Monthly Plan",
  "6month": "Studbridge Kids 6 Month Plan",
  yearly: "Studbridge Kids Yearly Plan",
};

/**
 * Lazily build the PhonePe Standard Checkout client (singleton).
 * The SDK manages the OAuth token lifecycle internally, so we only ever
 * initialize it once. Done lazily so the app still boots if PhonePe env
 * vars are absent (only payment routes will error, not the whole server).
 */
let phonePeClient = null;
const getClient = () => {
  if (phonePeClient) return phonePeClient;

  if (!phonePeConfig.clientId || !phonePeConfig.clientSecret) {
    const err = new Error("PhonePe is not configured on the server.");
    err.status = 500;
    throw err;
  }

  const env =
    phonePeConfig.environment === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX;

  phonePeClient = StandardCheckoutClient.getInstance(
    phonePeConfig.clientId,
    phonePeConfig.clientSecret,
    phonePeConfig.clientVersion,
    env,
  );
  return phonePeClient;
};

// Generate unique merchant transaction (order) id
const generateMerchantTransactionId = (user_id) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `STBKIDS_${user_id}_${timestamp}_${random}`;
};

/**
 * Initiate a payment via PhonePe Standard Checkout v2.
 * Creates a pending DB record, asks PhonePe for a hosted checkout URL,
 * and returns that URL for the frontend to redirect the user to.
 */
const initiatePayment = async (user_id, plan, user_mobile) => {
  if (!PLAN_AMOUNTS[plan]) {
    const err = new Error(
      "Invalid plan selected. Must be monthly, 6month, or yearly.",
    );
    err.status = 400;
    throw err;
  }

  const client = getClient();
  const amount = PLAN_AMOUNTS[plan]; // paise
  const merchantTransactionId = generateMerchantTransactionId(user_id);

  // Create pending record before calling PhonePe so we always have a trace
  await paymentRepository.createPaymentRecord(
    user_id,
    plan,
    amount / 100, // store in rupees
    merchantTransactionId,
  );

  // Where PhonePe sends the user back after payment; include our txn id
  const redirectUrl = `${phonePeConfig.redirectUrl}?txnId=${merchantTransactionId}`;

  // Build the v2 pay request — merchantOrderId IS our merchantTransactionId
  const request = StandardCheckoutPayRequest.builder()
    .merchantOrderId(merchantTransactionId)
    .amount(amount)
    .redirectUrl(redirectUrl)
    .build();

  const response = await client.pay(request);

  return {
    merchantTransactionId,
    paymentUrl: response.redirectUrl,
    amount: amount / 100,
    plan,
    planName: PLAN_NAMES[plan],
  };
};

/**
 * Verify payment status by querying PhonePe (source of truth) and, if the
 * order is COMPLETED, activate the subscription. Idempotent: safe to call
 * from both the post-redirect status check and the webhook.
 * @returns {Promise<Object>} { success, state, transactionId, data? }
 */
const verifyPayment = async (merchant_transaction_id) => {
  const client = getClient();

  const statusResponse = await client.getOrderStatus(merchant_transaction_id);
  const state = statusResponse.state; // PENDING | FAILED | COMPLETED
  const transactionId = statusResponse.orderId || statusResponse.order_id;

  if (state === "COMPLETED") {
    // Only activate if a pending record still exists (not yet activated)
    const pending = await paymentRepository.findByMerchantTransactionId(
      merchant_transaction_id,
    );
    let data = null;
    if (pending) {
      data = await paymentRepository.activateSubscription(
        merchant_transaction_id,
        transactionId,
      );
    }
    return { success: true, state, transactionId, data };
  }

  if (state === "FAILED") {
    const pending = await paymentRepository.findByMerchantTransactionId(
      merchant_transaction_id,
    );
    if (pending) {
      await paymentRepository.markPaymentFailed(merchant_transaction_id);
    }
    return { success: false, state, transactionId };
  }

  // PENDING (or any other non-terminal state)
  return { success: false, state, transactionId };
};

/**
 * Handle the PhonePe server-to-server callback (webhook).
 * Verifies authenticity via the SDK's validateCallback() using the
 * dashboard-configured username/password, then activates or fails the
 * subscription based on the verified order state.
 * @param {string} authHeader - value of the incoming Authorization header
 * @param {string} bodyString - raw/serialized JSON body string
 */
const handleCallback = async (authHeader, bodyString) => {
  const client = getClient();

  // Throws if the callback is not authentic — caller must handle
  const callbackResponse = client.validateCallback(
    phonePeConfig.webhookUsername,
    phonePeConfig.webhookPassword,
    authHeader,
    bodyString,
  );

  const payload = callbackResponse.payload || {};
  const state = payload.state;
  const merchantTransactionId = payload.merchantOrderId;
  const transactionId = payload.orderId;

  if (state === "COMPLETED") {
    const pending = await paymentRepository.findByMerchantTransactionId(
      merchantTransactionId,
    );
    if (!pending) {
      // Already processed — idempotent no-op
      return { success: true, alreadyProcessed: true };
    }
    const result = await paymentRepository.activateSubscription(
      merchantTransactionId,
      transactionId,
    );
    return { success: true, data: result };
  }

  if (state === "FAILED") {
    const pending = await paymentRepository.findByMerchantTransactionId(
      merchantTransactionId,
    );
    if (pending) {
      await paymentRepository.markPaymentFailed(merchantTransactionId);
    }
    return { success: false, state };
  }

  return { success: false, state };
};

module.exports = {
  initiatePayment,
  verifyPayment,
  handleCallback,
  PLAN_AMOUNTS,
  PLAN_NAMES,
};

const {
  StandardCheckoutClient,
  CustomCheckoutClient,
  Env,
  StandardCheckoutPayRequest,
  CustomCheckoutPayRequest,
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

  console.log("[PAYMENT_DEBUG] getClient: building PhonePe client", {
    hasClientId: Boolean(phonePeConfig.clientId),
    hasClientSecret: Boolean(phonePeConfig.clientSecret),
    clientVersion: phonePeConfig.clientVersion,
    environment: phonePeConfig.environment,
  });

  if (!phonePeConfig.clientId || !phonePeConfig.clientSecret) {
    console.error(
      "[PAYMENT_DEBUG] getClient FAILED: PhonePe credentials missing.",
      {
        clientIdPresent: Boolean(phonePeConfig.clientId),
        clientSecretPresent: Boolean(phonePeConfig.clientSecret),
      },
    );
    const err = new Error("PhonePe is not configured on the server.");
    err.status = 500;
    throw err;
  }

  const env =
    phonePeConfig.environment === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX;

  try {
    phonePeClient = StandardCheckoutClient.getInstance(
      phonePeConfig.clientId,
      phonePeConfig.clientSecret,
      phonePeConfig.clientVersion,
      env,
    );
    console.log("[PAYMENT_DEBUG] getClient: SDK client initialized OK");
  } catch (sdkInitErr) {
    console.error("[PAYMENT_DEBUG] getClient FAILED: SDK getInstance threw", {
      message: sdkInitErr.message,
      name: sdkInitErr.name,
      code: sdkInitErr.code,
      httpStatusCode: sdkInitErr.httpStatusCode,
      data: sdkInitErr.data,
      stack: sdkInitErr.stack,
    });
    throw sdkInitErr;
  }
  return phonePeClient;
};

/**
 * Lazily build the PhonePe Custom Checkout client (singleton).
 * Custom Checkout is required for the UPI Intent flow — it returns an
 * `intentUrl` that a mobile device opens directly into the user's UPI app,
 * instead of redirecting to PhonePe's hosted checkout page.
 *
 * NOTE: the Custom Checkout / UPI PG APIs must be enabled by PhonePe for the
 * merchant account. If they are not, client.pay() will reject with an
 * authorization error — that is a dashboard/onboarding step, not a code bug.
 */
let phonePeCustomClient = null;
const getCustomClient = () => {
  if (phonePeCustomClient) return phonePeCustomClient;

  if (!phonePeConfig.clientId || !phonePeConfig.clientSecret) {
    const err = new Error("PhonePe is not configured on the server.");
    err.status = 500;
    throw err;
  }

  const env =
    phonePeConfig.environment === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX;

  phonePeCustomClient = CustomCheckoutClient.getInstance(
    phonePeConfig.clientId,
    phonePeConfig.clientSecret,
    phonePeConfig.clientVersion,
    env,
  );
  return phonePeCustomClient;
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
  console.log("[PAYMENT_DEBUG] initiatePayment START", {
    user_id,
    plan,
    user_mobile,
  });

  // --- Case 1: invalid plan ---
  if (!PLAN_AMOUNTS[plan]) {
    console.error("[PAYMENT_DEBUG] FAIL@plan-validation: unknown plan", {
      plan,
      validPlans: Object.keys(PLAN_AMOUNTS),
    });
    const err = new Error(
      "Invalid plan selected. Must be monthly, 6month, or yearly.",
    );
    err.status = 400;
    throw err;
  }

  // --- Case 2: SDK client init (credentials / env) ---
  let client;
  try {
    client = getClient();
  } catch (clientErr) {
    console.error("[PAYMENT_DEBUG] FAIL@getClient", {
      message: clientErr.message,
    });
    throw clientErr;
  }

  const amount = PLAN_AMOUNTS[plan]; // paise
  const merchantTransactionId = generateMerchantTransactionId(user_id);
  console.log("[PAYMENT_DEBUG] prepared order", {
    amount,
    merchantTransactionId,
  });

  // --- Case 3: DB insert of pending record ---
  try {
    await paymentRepository.createPaymentRecord(
      user_id,
      plan,
      amount / 100, // store in rupees
      merchantTransactionId,
    );
    console.log("[PAYMENT_DEBUG] DB pending record created OK");
  } catch (dbErr) {
    console.error("[PAYMENT_DEBUG] FAIL@createPaymentRecord (DB insert)", {
      message: dbErr.message,
      code: dbErr.code, // pg error code, e.g. 23503 FK, 42703 undefined column
      detail: dbErr.detail,
      table: dbErr.table,
      column: dbErr.column,
      constraint: dbErr.constraint,
    });
    throw dbErr;
  }

  // Where PhonePe sends the user back after payment; include our txn id
  const redirectUrl = `${phonePeConfig.redirectUrl}?txnId=${merchantTransactionId}`;
  console.log("[PAYMENT_DEBUG] redirectUrl built", { redirectUrl });

  // --- Case 4: build the v2 pay request ---
  let request;
  try {
    request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantTransactionId)
      .amount(amount)
      .redirectUrl(redirectUrl)
      .build();
    console.log("[PAYMENT_DEBUG] pay request built OK");
  } catch (buildErr) {
    console.error("[PAYMENT_DEBUG] FAIL@buildRequest", {
      message: buildErr.message,
      stack: buildErr.stack,
    });
    throw buildErr;
  }

  // --- Case 5: PhonePe network/auth call (most likely failure point) ---
  let response;
  try {
    response = await client.pay(request);
    console.log("[PAYMENT_DEBUG] client.pay() OK", {
      hasRedirectUrl: Boolean(response && response.redirectUrl),
      response,
    });
  } catch (payErr) {
    console.error("[PAYMENT_DEBUG] FAIL@client.pay (PhonePe API call)", {
      message: payErr.message,
      name: payErr.name,
      code: payErr.code,
      httpStatusCode: payErr.httpStatusCode,
      data: payErr.data,
      responseData:
        payErr.response && payErr.response.data ? payErr.response.data : undefined,
      stack: payErr.stack,
    });
    throw payErr;
  }

  if (!response || !response.redirectUrl) {
    console.error(
      "[PAYMENT_DEBUG] FAIL@response: PhonePe returned no redirectUrl",
      { response },
    );
  }

  return {
    merchantTransactionId,
    paymentUrl: response.redirectUrl,
    amount: amount / 100,
    plan,
    planName: PLAN_NAMES[plan],
  };
};

/**
 * Initiate a UPI Intent payment via PhonePe Custom Checkout v2.
 *
 * Unlike Standard Checkout (which redirects to PhonePe's hosted page), this
 * returns an `intentUrl` (e.g. `upi://pay?...`). On a real mobile browser the
 * frontend navigates to that URL, which opens the UPI app chooser directly —
 * giving UPI top priority on mobile. A `qrData` string is also returned as a
 * desktop/scan fallback. There is no redirect: after paying, the frontend
 * polls GET /status/:merchantTransactionId (and the webhook confirms too).
 *
 * @param {number|string} user_id
 * @param {string} plan
 * @param {string} [deviceOS] - "ANDROID" | "IOS" (helps PhonePe shape intent)
 * @param {string} [targetApp] - optional UPI app package to target a single app
 */
const initiateUpiIntentPayment = async (user_id, plan, deviceOS, targetApp) => {
  console.log("[PAYMENT_DEBUG] initiateUpiIntentPayment START", {
    user_id,
    plan,
    deviceOS,
    targetApp,
  });

  if (!PLAN_AMOUNTS[plan]) {
    const err = new Error(
      "Invalid plan selected. Must be monthly, 6month, or yearly.",
    );
    err.status = 400;
    throw err;
  }

  let client;
  try {
    client = getCustomClient();
  } catch (clientErr) {
    console.error("[PAYMENT_DEBUG] FAIL@getCustomClient", {
      message: clientErr.message,
    });
    throw clientErr;
  }

  const amount = PLAN_AMOUNTS[plan]; // paise
  const merchantTransactionId = generateMerchantTransactionId(user_id);

  try {
    await paymentRepository.createPaymentRecord(
      user_id,
      plan,
      amount / 100, // store in rupees
      merchantTransactionId,
    );
    console.log("[PAYMENT_DEBUG] UPI intent: DB pending record created OK");
  } catch (dbErr) {
    console.error("[PAYMENT_DEBUG] FAIL@createPaymentRecord (UPI intent)", {
      message: dbErr.message,
      code: dbErr.code,
      detail: dbErr.detail,
    });
    throw dbErr;
  }

  let request;
  try {
    const builder = CustomCheckoutPayRequest.UpiIntentPayRequestBuilder()
      .merchantOrderId(merchantTransactionId)
      .amount(amount);
    if (deviceOS) builder.deviceOS(deviceOS);
    if (targetApp) builder.targetApp(targetApp);
    request = builder.build();
    console.log("[PAYMENT_DEBUG] UPI intent pay request built OK");
  } catch (buildErr) {
    console.error("[PAYMENT_DEBUG] FAIL@buildUpiIntentRequest", {
      message: buildErr.message,
      stack: buildErr.stack,
    });
    throw buildErr;
  }

  let response;
  try {
    response = await client.pay(request);
    console.log("[PAYMENT_DEBUG] UPI intent client.pay() OK", {
      hasIntentUrl: Boolean(response && response.intentUrl),
      hasQr: Boolean(response && response.qrData),
      state: response && response.state,
    });
  } catch (payErr) {
    console.error("[PAYMENT_DEBUG] FAIL@client.pay (UPI intent)", {
      message: payErr.message,
      name: payErr.name,
      code: payErr.code,
      httpStatusCode: payErr.httpStatusCode,
      data: payErr.data,
    });
    throw payErr;
  }

  return {
    merchantTransactionId,
    intentUrl: response.intentUrl,
    qrData: response.qrData,
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
  initiateUpiIntentPayment,
  verifyPayment,
  handleCallback,
  PLAN_AMOUNTS,
  PLAN_NAMES,
};

const paymentService = require("../services/payment.service");
const paymentRepository = require("../repositories/payment.repository");
const { initiatePaymentSchema } = require("../validators/payment.validator");

// POST /api/payment/initiate
// Student initiates a payment — must be logged in
const initiatePayment = async (req, res, next) => {
  try {
    console.log("[PAYMENT_DEBUG] /initiate hit", {
      body: req.body,
      userId: req.user && req.user.id,
    });

    const parsed = initiatePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("[PAYMENT_DEBUG] FAIL@body-validation", {
        errors: parsed.error.errors,
      });
      return res.status(400).json({
        error: parsed.error.errors[0]?.message || "Invalid request",
      });
    }

    const user_id = req.user.id;
    const { plan, mobile } = parsed.data;
    const user_mobile = mobile || req.user.parent_phone || "";

    const result = await paymentService.initiatePayment(
      user_id,
      plan,
      user_mobile,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    // Log the FULL error so the real failure cause is visible in server logs.
    console.error("[PAYMENT_DEBUG] /initiate caught error", {
      message: err.message,
      name: err.name,
      status: err.status,
      code: err.code,
      httpStatusCode: err.httpStatusCode,
      data: err.data,
      stack: err.stack,
    });

    const status = err.status || 503;
    return res.status(status).json({
      error: err.message || "Unable to process payments right now. Please try again later.",
    });
  }
};

// GET /api/payment/status/:merchantTransactionId
// Called after redirect from the PhonePe payment page.
// verifyPayment() checks PhonePe (source of truth) and activates if COMPLETED.
const checkPaymentStatus = async (req, res, next) => {
  try {
    const { merchantTransactionId } = req.params;

    if (!merchantTransactionId) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    const result = await paymentService.verifyPayment(merchantTransactionId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Payment successful! Your plan is now active.",
        data: result,
      });
    } else {
      res.status(200).json({
        success: false,
        message: `Payment ${result.state ? result.state.toLowerCase() : "not completed"}.`,
        data: result,
      });
    }
  } catch (err) {
    console.error("Payment status check error:", err.message, err.stack);
    return res.status(503).json({
      error: "Unable to verify payment right now. Please try again later.",
    });
  }
};

// POST /api/payment/callback
// PhonePe server-to-server webhook — NO auth middleware on this route.
// Authenticity is verified inside the service via the SDK's validateCallback().
const handleCallback = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const bodyString =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    await paymentService.handleCallback(authHeader, bodyString);
    // PhonePe expects a 200 response to stop retrying
    res.status(200).json({ success: true });
  } catch (err) {
    // Still return 200 to PhonePe to acknowledge receipt and stop retries
    console.error("Callback processing error:", err.message);
    res.status(200).json({ success: false });
  }
};

// GET /api/payment/my-subscription
// Student checks their current subscription
const getMySubscription = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const subscription = await paymentRepository.getUserSubscription(user_id);
    res.status(200).json({ data: subscription });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  initiatePayment,
  checkPaymentStatus,
  handleCallback,
  getMySubscription,
};

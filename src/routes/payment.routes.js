const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const auth = require("../middleware/auth");
const { apiLimiter, authLimiter } = require("../middleware/rateLimiter");

/**
 * Payment Routes — PhonePe Checkout v2
 * POST /initiate                        ← hosted Standard Checkout (auth)
 * POST /initiate-upi                    ← UPI Intent, mobile-first (auth)
 * GET  /status/:merchantTransactionId   ← check status after redirect (auth)
 * POST /callback                        ← PhonePe server-to-server webhook (no auth)
 * GET  /my-subscription                 ← student views their subscription (auth)
 */

// Student initiates payment — must be logged in
router.post("/initiate", auth, authLimiter, paymentController.initiatePayment);

// Student initiates a UPI Intent payment (mobile-first) — must be logged in
router.post(
  "/initiate-upi",
  auth,
  authLimiter,
  paymentController.initiateUpiIntent,
);

// Check payment status after redirect — must be logged in
router.get(
  "/status/:merchantTransactionId",
  auth,
  apiLimiter,
  paymentController.checkPaymentStatus,
);

// PhonePe server-to-server callback — NO auth middleware (PhonePe has no JWT)
router.post("/callback", paymentController.handleCallback);

// Student views their subscription
router.get(
  "/my-subscription",
  auth,
  apiLimiter,
  paymentController.getMySubscription,
);

module.exports = router;

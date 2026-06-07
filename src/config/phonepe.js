// PhonePe configuration — all values from environment variables
// DO NOT hardcode any keys, secrets, or IDs.
// These are PhonePe Standard Checkout v2 (OAuth) credentials:
// Client ID + Client Version + Client Secret. The official SDK
// (@phonepe-pg/pg-sdk-node) manages the OAuth token lifecycle internally.

module.exports = {
  clientId: process.env.PHONEPE_CLIENT_ID,
  // SDK expects clientVersion as a number
  clientVersion: Number(process.env.PHONEPE_CLIENT_VERSION) || 1,
  clientSecret: process.env.PHONEPE_CLIENT_SECRET,
  // Environment: 'PRODUCTION' or 'SANDBOX' — read from env
  environment: process.env.PHONEPE_ENV || "SANDBOX",
  // Redirect URL the user lands on after completing/cancelling payment
  redirectUrl:
    process.env.PHONEPE_REDIRECT_URL ||
    `${process.env.FRONTEND_URL}/payment/status`,
  // Server-to-server webhook URL configured in the PhonePe dashboard
  callbackUrl:
    process.env.PHONEPE_CALLBACK_URL ||
    `${process.env.BACKEND_URL}/api/payment/callback`,
  // Webhook Basic-Auth credentials configured in the PhonePe dashboard.
  // Required by the SDK's validateCallback() to verify webhook authenticity.
  webhookUsername: process.env.PHONEPE_WEBHOOK_USERNAME,
  webhookPassword: process.env.PHONEPE_WEBHOOK_PASSWORD,
};

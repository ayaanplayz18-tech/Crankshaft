const crypto = require("crypto");

async function sendVerifiedWebhook({ webhookUrl, secret, order, utr, verifiedAt }) {
  if (!webhookUrl) {
    console.warn("[WEBHOOK] No webhookUrl provided for order", order.orderId);
    return false;
  }

  const payload = JSON.stringify({
    event: "payment.verified",
    order: {
      id: order.orderId,
      utr: utr,
      amount: order.amount,
      expectedAmount: order.expectedAmount,
      verifiedAt: verifiedAt ? new Date(verifiedAt).toISOString() : new Date().toISOString(),
      metadata: order.metadata || {},
    },
  });

  const webhookSecret = secret || process.env.WEBHOOK_SECRET || "default_secret";
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  console.log(`[WEBHOOK] Dispatching payment.verified to ${webhookUrl} for order ${order.orderId}...`);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upilerify-Signature": signature,
      },
      body: payload,
    });

    if (res.ok) {
      console.log(`[WEBHOOK] Successfully delivered to ${webhookUrl} (status: ${res.status})`);
      return true;
    } else {
      console.error(`[WEBHOOK] Delivery failed with status ${res.status} from ${webhookUrl}`);
      return false;
    }
  } catch (err) {
    console.error(`[WEBHOOK ERROR] Could not connect to ${webhookUrl}:`, err.message);
    return false;
  }
}

module.exports = { sendVerifiedWebhook };

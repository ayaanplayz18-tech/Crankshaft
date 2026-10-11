require("dotenv").config();
const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");
const { connectDB, db } = require("./lib/db");
const { scanEmailsAndMatch } = require("./lib/imapScanner");
const { sendVerifiedWebhook } = require("./lib/webhook");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration
const PORT = process.env.PORT || 3001;
const HOST = "0.0.0.0"; // Required by Render to bind on all interfaces
const DEFAULT_UPI_ID = process.env.DEFAULT_UPI_ID || "ayaan@okaxis";
const DEFAULT_UPI_NAME = process.env.DEFAULT_UPI_NAME || "CrankShaft";
const CRON_SECRET = process.env.CRON_SECRET;
const SERVICE_URL = process.env.SERVICE_URL || `http://localhost:${PORT}`;

// Connect to MongoDB upon boot
connectDB().catch(console.error);

// ─── 1. HEALTH CHECK ENDPOINT (RENDER REQUIREMENT) ─────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "upilerify-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── 2. CREATE PAYMENT ORDER ───────────────────────────────────────────────
app.post("/api/orders/create", async (req, res) => {
  try {
    const {
      amount,
      merchantUpiId = DEFAULT_UPI_ID,
      merchantName = DEFAULT_UPI_NAME,
      useMicroOffset = true,
      webhookUrl = process.env.WEBHOOK_URL,
      metadata = {},
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid payment amount" });
    }

    const orderId = `upi_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Micro-offset generation (between 0.01 and 0.09) to uniquely identify concurrent payments
    const offset = useMicroOffset ? Math.floor(Math.random() * 90 + 10) / 1000 : 0;
    const expectedAmount = parseFloat((parsedAmount + offset).toFixed(2));

    const upiIntentUri = `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=${encodeURIComponent(
      merchantName
    )}&am=${expectedAmount}&cu=INR&tn=${encodeURIComponent(`Order ${orderId}`)}`;

    const checkoutUrl = `${SERVICE_URL}/pay/${orderId}`;

    const order = await db.saveOrder({
      orderId,
      amount: parsedAmount,
      expectedAmount,
      merchantUpiId,
      merchantName,
      webhookUrl,
      metadata,
      status: "PENDING",
      matchedUtr: null,
      verifiedAt: null,
    });

    console.log(`[ORDER CREATED] ${orderId} - Amount: ₹${parsedAmount} (Expected: ₹${expectedAmount})`);

    return res.status(201).json({
      success: true,
      order: {
        id: orderId,
        amount: parsedAmount,
        expectedAmount,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
      checkoutUrl,
      upiIntentUri,
    });
  } catch (err) {
    console.error("[ORDER CREATE ERROR]", err);
    return res.status(500).json({ success: false, error: "Failed to create order" });
  }
});

// ─── 3. ORDER STATUS CHECK (FRONTEND POLLING) ──────────────────────────────
app.get("/api/orders/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await db.findOrder(orderId);

    if (!order) {
      return res.status(404).json({ status: "FAILED", error: "Order not found" });
    }

    return res.json({
      status: order.status,
      order: {
        id: order.orderId,
        matchedUtr: order.matchedUtr || null,
        expectedAmount: order.expectedAmount,
        verifiedAt: order.verifiedAt || null,
      },
    });
  } catch (err) {
    console.error("[ORDER STATUS ERROR]", err);
    return res.status(500).json({ status: "FAILED", error: "Failed to check status" });
  }
});

// ─── 4. PROTECTED DELAYED-CRON GMAIL SCANNER (CRON-JOB.ORG ENDPOINT) ───────
app.get("/api/check-emails", async (req, res) => {
  try {
    // Validate Authorization header with Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "Missing or malformed Authorization header. Expected: Bearer <CRON_SECRET>",
      });
    }

    const providedToken = authHeader.split(" ")[1];
    if (CRON_SECRET && providedToken !== CRON_SECRET) {
      return res.status(401).json({
        ok: false,
        error: "Invalid cron secret.",
      });
    }

    console.log(`[CRON TRIGGERED] Running Gmail IMAP credit-alert scan at ${new Date().toISOString()}...`);

    // Execute one clean Gmail IMAP scan and close connection
    const result = await scanEmailsAndMatch();

    console.log(`[CRON FINISHED] Scanned: ${result.scannedEmails}, Matched: ${result.matchedOrders}`);

    return res.json({
      ok: result.ok,
      checkedAt: result.checkedAt,
      matchedOrders: result.matchedOrders,
      scannedEmails: result.scannedEmails,
      errors: result.errors,
      note: result.note,
    });
  } catch (err) {
    console.error("[CHECK EMAILS ERROR]", err);
    return res.status(500).json({
      ok: false,
      checkedAt: new Date().toISOString(),
      matchedOrders: 0,
      errors: [err.message],
    });
  }
});

// ─── 5. MANUAL UTR VERIFICATION FALLBACK ───────────────────────────────────
app.post("/api/verify-utr", async (req, res) => {
  try {
    const { orderId, utr } = req.body;

    if (!orderId || !utr) {
      return res.status(400).json({ success: false, error: "orderId and utr are required" });
    }

    const cleanUtr = String(utr).trim();
    if (!/^[A-Za-z0-9]{10,25}$/.test(cleanUtr)) {
      return res.status(400).json({ success: false, error: "Invalid UTR / Transaction ID. Must be 10-25 alphanumeric characters." });
    }

    const order = await db.findOrder(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Replay / Double-spend prevention
    const alreadyProcessed = await db.isUtrProcessed(cleanUtr);
    if (alreadyProcessed && order.status !== "VERIFIED") {
      return res.status(409).json({ success: false, error: "This UTR is already claimed for another order." });
    }

    const updated = await db.markOrderVerified(orderId, cleanUtr);
    await db.recordProcessedAlert({
      utr: cleanUtr,
      amount: order.expectedAmount,
      matchedOrderId: orderId,
    });

    // Send signed webhook
    await sendVerifiedWebhook({
      webhookUrl: order.webhookUrl || process.env.WEBHOOK_URL,
      secret: process.env.WEBHOOK_SECRET,
      order: updated || order,
      utr: cleanUtr,
      verifiedAt: new Date(),
    });

    console.log(`[MANUAL UTR VERIFIED] Order ${orderId} verified with UTR ${cleanUtr}`);

    return res.json({
      success: true,
      status: "VERIFIED",
      matchedUtr: cleanUtr,
      order: {
        id: orderId,
        expectedAmount: order.expectedAmount,
        status: "VERIFIED",
      },
    });
  } catch (err) {
    console.error("[VERIFY UTR ERROR]", err);
    return res.status(500).json({ success: false, error: "Failed to verify UTR" });
  }
});

// ─── 6. HOSTED CHECKOUT PAGE (DESKTOP QR & MOBILE UPI DEEP-LINK) ───────────
app.get("/pay/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await db.findOrder(orderId);

    if (!order) {
      return res.status(404).send("<h2>Order not found</h2>");
    }

    const upiUri = `upi://pay?pa=${encodeURIComponent(order.merchantUpiId)}&pn=${encodeURIComponent(
      order.merchantName
    )}&am=${order.expectedAmount}&cu=INR&tn=${encodeURIComponent(`Order ${order.orderId}`)}`;

    const qrSvg = await QRCode.toString(upiUri, { type: "svg", margin: 2 });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UPIlerify Checkout — ${order.orderId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #030714; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #0a0f1d; border: 1px solid #1f293d; border-radius: 20px; padding: 28px; max-width: 420px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); text-align: center; }
    .badge { display: inline-block; background: rgba(0, 210, 255, 0.15); color: #00d2ff; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    h1 { font-size: 20px; margin: 0 0 16px 0; }
    .amount-box { background: #030714; border: 1px solid #1a2234; border-radius: 14px; padding: 14px; margin-bottom: 20px; }
    .amount-label { font-size: 11px; color: #8892b0; text-transform: uppercase; letter-spacing: 0.05em; }
    .amount-val { font-size: 32px; font-weight: 800; color: #fff; font-family: monospace; margin: 4px 0; }
    .amount-note { font-size: 11px; color: #00d2ff; font-weight: 500; }
    .qr-container { background: #fff; padding: 12px; border-radius: 14px; display: inline-block; margin-bottom: 20px; }
    .qr-container svg { width: 180px; height: 180px; display: block; }
    .btn-upi { display: block; background: #00d2ff; color: #000; font-weight: 700; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-size: 13px; margin-bottom: 12px; transition: transform 0.15s; }
    .btn-upi:active { transform: scale(0.98); }
    .polling-status { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 12px; color: #8892b0; font-family: monospace; margin-top: 14px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #00d2ff; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.3; transform: scale(0.8); } }
    .verified-state { display: none; background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; border-radius: 14px; padding: 20px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">UPIlerify Checkout</div>
    <h1>Scan & Pay via Any UPI App</h1>

    <div class="amount-box">
      <div class="amount-label">Exact Amount to Pay</div>
      <div class="amount-val">₹${order.expectedAmount.toFixed(2)}</div>
      <div class="amount-note">Pay exact amount with paisa offset to match order automatically</div>
    </div>

    <div class="qr-container">${qrSvg}</div>

    <a href="${upiUri}" class="btn-upi">Open UPI App (GPay / PhonePe / Paytm)</a>

    <div class="polling-status" id="pollBox">
      <div class="dot"></div>
      <span id="pollText">Waiting for bank credit alert...</span>
    </div>

    <div class="verified-state" id="verifiedBox">
      <h3 style="color:#22c55e;margin:0 0 6px 0;">Payment Verified!</h3>
      <p style="font-size:12px;color:#cbd5e1;margin:0;" id="utrText"></p>
    </div>
  </div>

  <script>
    const orderId = "${order.orderId}";
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/orders/' + orderId + '/status');
        const data = await res.json();
        if (data.status === 'VERIFIED') {
          clearInterval(timer);
          document.getElementById('pollBox').style.display = 'none';
          const vBox = document.getElementById('verifiedBox');
          vBox.style.display = 'block';
          document.getElementById('utrText').innerText = 'UTR: ' + (data.order.matchedUtr || 'Confirmed') + ' — Order Settled!';
        }
      } catch (e) {}
    }, 3000);
  </script>
</body>
</html>
    `;

    res.send(html);
  } catch (err) {
    console.error("[CHECKOUT PAGE ERROR]", err);
    res.status(500).send("Error rendering checkout page");
  }
});

// ─── START SERVER BINDING TO 0.0.0.0 ───────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 UPIlerify Service running on http://${HOST}:${PORT}`);
  console.log(`📌 Health check:   http://${HOST}:${PORT}/health`);
  console.log(`⏱️ Cron endpoint:  GET http://${HOST}:${PORT}/api/check-emails`);
  console.log(`=======================================================`);
});

// ─── AUTO-SCAN INTERVAL FOR LOCAL & BACKGROUND POLLING ─────────────────────
const AUTO_SCAN_INTERVAL_MS = 15000;
let isScanning = false;

setInterval(async () => {
  if (isScanning) return;
  isScanning = true;
  try {
    const pending = await db.findPendingOrders();
    if (pending && pending.length > 0) {
      console.log(`[AUTO SCAN] Found ${pending.length} pending order(s). Scanning Gmail...`);
      const scanResult = await scanEmailsAndMatch();
      if (scanResult.matchedOrders > 0) {
        console.log(`[AUTO SCAN SUCCESS] Matched ${scanResult.matchedOrders} order(s)!`);
      }
    }
  } catch (err) {
    console.error("[AUTO SCAN ERROR]", err.message);
  } finally {
    isScanning = false;
  }
}, AUTO_SCAN_INTERVAL_MS);

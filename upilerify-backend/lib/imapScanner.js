const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const { parseBankAlert } = require("./utrParser");
const { sendVerifiedWebhook } = require("./webhook");
const { db } = require("./db");

async function scanEmailsAndMatch() {
  const email = process.env.GMAIL_ADDRESS;
  const password = process.env.GMAIL_APP_PASSWORD;

  // If credentials are dummy/placeholder or missing, return safe diagnostics
  if (!email || !password || email.includes("your") || password.includes("dummy")) {
    console.log("[IMAP] Gmail credentials not set or using placeholder. Skipping live IMAP scan.");
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      matchedOrders: 0,
      scannedEmails: 0,
      note: "IMAP scan skipped (GMAIL_ADDRESS / GMAIL_APP_PASSWORD not configured yet)",
      errors: [],
    };
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: email,
      pass: password.replace(/\s+/g, ""), // clean spaces from app password
    },
    logger: false,
  });

  const errors = [];
  let scannedEmails = 0;
  let matchedOrders = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const status = await client.status("INBOX", { messages: true });
      const totalMessages = status.messages || 0;
      if (totalMessages === 0) {
        return { ok: true, scannedEmails: 0, matchedOrders: 0, errors: [] };
      }

      // Fetch latest 30 messages in mailbox to reliably process recent alerts without missing read emails
      const fetchStart = Math.max(1, totalMessages - 30);
      const messages = client.fetch(`${fetchStart}:${totalMessages}`, { source: true, envelope: true });

      // Fetch active pending orders from DB
      const pendingOrders = await db.findPendingOrders();

      for await (const message of messages) {
        scannedEmails++;
        const parsed = await simpleParser(message.source);
        const subject = parsed.subject || "";
        const textBody = parsed.text || parsed.html || "";

        const { utr, amount } = parseBankAlert(textBody, subject);

        if (utr && amount) {
          // Check if this UTR has already been processed to ensure idempotency
          const alreadyProcessed = await db.isUtrProcessed(utr);
          if (alreadyProcessed) {
            console.log(`[IMAP] UTR ${utr} was already processed. Skipping duplicate.`);
            continue;
          }

          // Match with pending order based on exact micro-offset expectedAmount
          const matchedOrder = pendingOrders.find(
            (ord) => Math.abs(ord.expectedAmount - amount) < 0.005 && ord.status === "PENDING"
          );

          if (matchedOrder) {
            console.log(`[IMAP MATCH] Matched Order ${matchedOrder.orderId} (₹${matchedOrder.expectedAmount}) with UTR ${utr}`);

            // Update order status in DB
            const updated = await db.markOrderVerified(matchedOrder.orderId, utr);

            // Record alert in DB to prevent duplicate processing
            await db.recordProcessedAlert({
              messageId: message.envelope?.messageId || `msg_${Date.now()}`,
              utr,
              amount,
              rawSubject: subject,
              matchedOrderId: matchedOrder.orderId,
            });

            // Send signed webhook to main Next.js app
            await sendVerifiedWebhook({
              webhookUrl: matchedOrder.webhookUrl || process.env.WEBHOOK_URL,
              secret: process.env.WEBHOOK_SECRET,
              order: updated || matchedOrder,
              utr,
              verifiedAt: new Date(),
            });

            matchedOrders++;
          }
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error("[IMAP SCAN ERROR]", err.message);
    errors.push(err.message);
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore logout cleanup error
    }
  }

  return {
    ok: errors.length === 0,
    checkedAt: new Date().toISOString(),
    matchedOrders,
    scannedEmails,
    errors,
  };
}

module.exports = { scanEmailsAndMatch };

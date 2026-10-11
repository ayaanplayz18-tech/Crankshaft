import crypto from "node:crypto";
import { NextResponse } from "next/server";
import AdminLog from "@/lib/models/AdminLog";
import Order from "@/lib/models/Order";
import Share from "@/lib/models/Share";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-upilerify-signature");
    const webhookSecret = process.env.UPILERIFY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn(
        "[WEBHOOK_WARNING] UPILERIFY_WEBHOOK_SECRET is not configured.",
      );
    } else {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (!signature || signature !== expectedSignature) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
    }

    const event = JSON.parse(rawBody);

    if (event.event === "payment.verified" && event.order) {
      await connectDB();

      const upilerifyOrderId = event.order.id;
      const internalOrderId = event.order.metadata?.orderId;
      const utr = event.order.utr || event.order.matchedUtr;
      const verifiedAt = event.order.verifiedAt
        ? new Date(event.order.verifiedAt)
        : new Date();

      // Find order by UPIlerify order id or internal order id
      const order = await Order.findOne({
        $or: [
          { upilerifyOrderId },
          ...(internalOrderId ? [{ orderId: internalOrderId }] : []),
        ],
      });

      if (order) {
        // Idempotency: only update if not already PAID
        if (order.status !== "PAID") {
          order.status = "PAID";
          order.utr = utr;
          order.paidAt = verifiedAt;
          await order.save();

          // If this is a share purchase, update the Share record too
          if (order.metadata?.type === "shares") {
            await Share.findOneAndUpdate(
              { orderId: order.orderId },
              { status: "PAID", utr, paidAt: verifiedAt },
              { new: true },
            );
          }

          const isOrderGhost =
            order.metadata?.username === "ayaan_admin" ||
            (order.userId &&
              (await User.exists({ _id: order.userId, role: "ghost" })));

          if (!isOrderGhost) {
            // Log in Admin Terminal
            await AdminLog.create({
              adminName: "system",
              command: `Payment verified via UPIlerify webhook: Order ${order.orderId} (UTR: ${utr || "N/A"}) - ₹${order.expectedAmount.toFixed(2)} PAID${order.metadata?.type === "shares" ? ` [${order.metadata.numberOfShares} shares]` : ""}`,
              actionType: "SYSTEM",
              metadata: {
                orderId: order.orderId,
                upilerifyOrderId,
                utr,
                amount: order.expectedAmount,
                type: order.metadata?.type,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[UPILERIFY_WEBHOOK_ERROR]", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

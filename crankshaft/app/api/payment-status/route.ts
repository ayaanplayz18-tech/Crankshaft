import { NextResponse } from "next/server";
import AdminLog from "@/lib/models/AdminLog";
import Order from "@/lib/models/Order";
import Share from "@/lib/models/Share";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/mongodb";

const UPILERIFY_URL = process.env.UPILERIFY_URL || "http://localhost:3001";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    await connectDB();

    const order = await Order.findOne({
      $or: [{ orderId }, { upilerifyOrderId: orderId }],
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If order is already PAID in our DB, return immediately
    if (order.status === "PAID") {
      return NextResponse.json({
        status: "VERIFIED",
        orderStatus: "PAID",
        matchedUtr: order.utr ?? null,
        orderId: order.orderId,
        expectedAmount: order.expectedAmount,
        type: order.metadata?.type,
        numberOfShares: order.metadata?.numberOfShares,
        username: order.metadata?.username,
      });
    }

    // If UPIlerify order ID exists, poll the external UPIlerify service
    if (order.upilerifyOrderId && UPILERIFY_URL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = await fetch(
          `${UPILERIFY_URL}/api/orders/${order.upilerifyOrderId}/status`,
          { signal: controller.signal },
        );

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.status === "VERIFIED") {
            order.status = "PAID";
            order.utr = data.order?.matchedUtr || data.matchedUtr || order.utr;
            order.paidAt = new Date();
            await order.save();

            // Update share record if applicable
            if (order.metadata?.type === "shares") {
              await Share.findOneAndUpdate(
                { orderId: order.orderId },
                { status: "PAID", utr: order.utr, paidAt: order.paidAt },
                { new: true },
              );
            }

            const isOrderGhost =
              order.metadata?.username === "ayaan_admin" ||
              (order.userId &&
                (await User.exists({ _id: order.userId, role: "ghost" })));

            if (!isOrderGhost) {
              await AdminLog.create({
                adminName: "system",
                command: `Payment confirmed via status poll: Order ${order.orderId} (UTR: ${order.utr || "N/A"}) - ₹${order.expectedAmount.toFixed(2)}${order.metadata?.type === "shares" ? ` [${order.metadata.numberOfShares} shares]` : ""}`,
                actionType: "SYSTEM",
                metadata: {
                  orderId: order.orderId,
                  utr: order.utr,
                  type: order.metadata?.type,
                },
              });
            }

            return NextResponse.json({
              status: "VERIFIED",
              orderStatus: "PAID",
              matchedUtr: order.utr,
              orderId: order.orderId,
              type: order.metadata?.type,
              numberOfShares: order.metadata?.numberOfShares,
              username: order.metadata?.username,
            });
          }
        }
      } catch {
        // standalone service unreachable or still polling
      }
    }

    return NextResponse.json({
      status: order.status === "PAID" ? "VERIFIED" : "PENDING",
      orderStatus: order.status,
      matchedUtr: order.utr ?? null,
      orderId: order.orderId,
      expectedAmount: order.expectedAmount,
      type: order.metadata?.type,
      numberOfShares: order.metadata?.numberOfShares,
      username: order.metadata?.username,
    });
  } catch (err: any) {
    console.error("[PAYMENT_STATUS_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 },
    );
  }
}

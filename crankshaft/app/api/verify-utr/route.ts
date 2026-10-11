import { NextResponse } from "next/server";
import AdminLog from "@/lib/models/AdminLog";
import Order from "@/lib/models/Order";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/mongodb";

const UPILERIFY_URL = process.env.UPILERIFY_URL || "http://localhost:3001";

export async function POST(req: Request) {
  try {
    const { orderId, utr } = await req.json();

    if (!orderId || !utr) {
      return NextResponse.json(
        { error: "orderId and utr are required" },
        { status: 400 },
      );
    }

    const cleanUtr = String(utr).trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      return NextResponse.json(
        { error: "Invalid UTR. Must be exactly 12 digits." },
        { status: 400 },
      );
    }

    await connectDB();

    const order = await Order.findOne({
      $or: [{ orderId }, { upilerifyOrderId: orderId }],
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Double-spend / replay check: ensure this UTR has not already been used for another paid order
    const existingWithUtr = await Order.findOne({
      utr: cleanUtr,
      status: "PAID",
      _id: { $ne: order._id },
    });

    if (existingWithUtr) {
      return NextResponse.json(
        { error: "This UTR has already been claimed for another order." },
        { status: 409 },
      );
    }

    // Call UPIlerify's manual UTR verification endpoint
    if (!UPILERIFY_URL || !order.upilerifyOrderId) {
      return NextResponse.json(
        {
          error:
            "Payment verification service is currently unavailable. Please wait for automated credit alert scan.",
        },
        { status: 503 },
      );
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${UPILERIFY_URL}/api/verify-utr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.upilerifyOrderId,
          utr: cleanUtr,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const upiData = await res.json().catch(() => ({}));

      if (!res.ok || !upiData.success) {
        return NextResponse.json(
          {
            error:
              upiData.error ||
              "UTR could not be verified by payment service. Please recheck your 12-digit reference number.",
          },
          { status: res.status >= 400 && res.status < 500 ? res.status : 400 },
        );
      }

      // Mark order as PAID only after UPIlerify verified match
      order.status = "PAID";
      order.utr = cleanUtr;
      order.paidAt = new Date();
      await order.save();

      const isOrderGhost =
        order.metadata?.username === "ayaan_admin" ||
        (order.userId &&
          (await User.exists({ _id: order.userId, role: "ghost" })));

      if (!isOrderGhost) {
        await AdminLog.create({
          adminName: "system",
          command: `Manual UTR verified via UPIlerify: Order ${order.orderId} (UTR: ${cleanUtr}) - ₹${order.expectedAmount.toFixed(2)} PAID`,
          actionType: "SYSTEM",
          metadata: { orderId: order.orderId, utr: cleanUtr },
        });
      }

      return NextResponse.json({
        success: true,
        status: "VERIFIED",
        orderStatus: "PAID",
        utr: cleanUtr,
        message: "Payment successfully verified with UTR via UPIlerify",
      });
    } catch (fetchErr: any) {
      console.error("[UPIlerify Verify UTR Timeout/Error]", fetchErr);
      return NextResponse.json(
        {
          error:
            "Verification service timed out. Please wait 1-2 minutes for automated bank alert scan or retry.",
        },
        { status: 504 },
      );
    }
  } catch (err: any) {
    console.error("[VERIFY_UTR_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to verify UTR" },
      { status: 500 },
    );
  }
}

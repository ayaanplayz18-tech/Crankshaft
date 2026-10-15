import { NextResponse } from "next/server";
import { getSession, isGhostSession } from "@/lib/auth";
import AdminLog from "@/lib/models/AdminLog";
import Order from "@/lib/models/Order";
import Share from "@/lib/models/Share";
import { connectDB } from "@/lib/mongodb";
import { getSharePrice, MAX_PUBLIC_SHARES } from "@/lib/shares";

const UPILERIFY_URL = process.env.UPILERIFY_URL || "http://localhost:3001";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const UPI_ID = process.env.UPI_ID || "ayaan@okaxis";
const UPI_PAYEE_NAME = process.env.UPI_PAYEE_NAME || "CrankShaft";

export async function POST(req: Request) {
  try {
    // Authenticate user - purchasing only allowed if logged in
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Please log in to purchase profit shares." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { numberOfShares, name, username: fallbackName, phone } = body;

    const parsedShares = parseInt(numberOfShares, 10);
    if (Number.isNaN(parsedShares) || parsedShares < 1) {
      return NextResponse.json(
        { error: "Invalid number of shares" },
        { status: 400 },
      );
    }

    await connectDB();
    const pricePerShare = await getSharePrice();

    // Check availability in Market pool (reserved pool is admin-only)
    const soldResult = await Share.aggregate([
      { $match: { status: "PAID", pool: { $ne: "reserved" } } },
      { $group: { _id: null, total: { $sum: "$numberOfShares" } } },
    ]);
    const totalSold = soldResult[0]?.total ?? 0;
    const available = MAX_PUBLIC_SHARES - totalSold;

    if (parsedShares > available) {
      return NextResponse.json(
        {
          error: `Only ${available} market shares are available. Please reduce quantity.`,
        },
        { status: 409 },
      );
    }

    const totalPrice = parsedShares * pricePerShare;
    const userId = session.userId;
    // If user doesn't enter a name for the shares, use their username
    const customName = typeof name === "string" ? name.trim() : "";
    const username =
      customName ||
      (typeof fallbackName === "string" && fallbackName.trim()) ||
      session.username;

    // Micro-offset for UPI matching
    const offsetPaisa = Math.floor(Math.random() * 90 + 10) / 1000;
    const expectedAmount = parseFloat((totalPrice + offsetPaisa).toFixed(2));

    const orderId = `shr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fallbackUpiIntent = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${expectedAmount}&cu=INR&tn=${encodeURIComponent(`CrankShaft Profit Shares ${orderId}`)}`;
    const fallbackCheckoutUrl = `${APP_URL}/shares?orderId=${orderId}`;

    // Save pending share order
    await Share.create({
      userId,
      username,
      phone: phone || "",
      numberOfShares: parsedShares,
      totalPrice,
      pricePerShare,
      orderId,
      pool: "market",
      status: "PENDING",
    });

    // Create internal Order record (reuses the payment system)
    const order = await Order.create({
      orderId,
      userId,
      items: [
        {
          productId: "shares",
          name: `CrankShaft Profit Shares × ${parsedShares}`,
          price: pricePerShare,
          quantity: parsedShares,
          imageUrl: "",
        },
      ],
      amount: totalPrice,
      expectedAmount,
      upiIntentUri: fallbackUpiIntent,
      checkoutUrl: fallbackCheckoutUrl,
      status: "PENDING",
      metadata: {
        type: "shares",
        numberOfShares: parsedShares,
        pricePerShare,
        username,
        userId,
      },
    });

    // Attempt UPIlerify
    let upiIntentUri = fallbackUpiIntent;
    let checkoutUrl = fallbackCheckoutUrl;
    let upilerifyOrderId = orderId;

    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${UPILERIFY_URL}/api/orders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalPrice,
          merchantUpiId: UPI_ID,
          merchantName: UPI_PAYEE_NAME,
          useMicroOffset: true,
          webhookUrl: `${APP_URL}/api/webhooks/upilerify`,
          metadata: {
            orderId,
            userId,
            type: "shares",
            numberOfShares: parsedShares,
          },
        }),
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order) {
          upilerifyOrderId = data.order.id;
          upiIntentUri = data.upiIntentUri || fallbackUpiIntent;
          checkoutUrl = data.checkoutUrl || fallbackCheckoutUrl;

          order.upilerifyOrderId = upilerifyOrderId;
          order.upiIntentUri = upiIntentUri;
          order.checkoutUrl = checkoutUrl;
          order.expectedAmount = data.order.expectedAmount || expectedAmount;
          await order.save();
        }
      }
    } catch {
      // UPIlerify offline – continue with fallback intent
    }

    const isGhostUser =
      (await isGhostSession(session)) ||
      username === "ayaan_admin" ||
      session?.username === "ayaan_admin";

    if (!isGhostUser) {
      await AdminLog.create({
        adminName: "system",
        command: `Share purchase initiated: ${parsedShares} shares for ₹${order.expectedAmount.toFixed(2)} by ${username} (Order: ${orderId})`,
        actionType: "SYSTEM",
        metadata: { orderId, numberOfShares: parsedShares, totalPrice, userId },
      });
    }

    return NextResponse.json({
      success: true,
      orderId,
      upilerifyOrderId,
      upiIntentUri,
      checkoutUrl,
      expectedAmount: order.expectedAmount,
      numberOfShares: parsedShares,
      totalPrice,
      pricePerShare,
      username,
    });
  } catch (err: any) {
    console.error("[SHARES_PURCHASE_ERROR]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create share order" },
      { status: 500 },
    );
  }
}

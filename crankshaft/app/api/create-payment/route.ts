import { NextResponse } from "next/server";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import { connectDB } from "@/lib/mongodb";

const UPILERIFY_URL = process.env.UPILERIFY_URL || "http://localhost:3001";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const UPI_ID = process.env.UPI_ID || "8123738080@fam";
const UPI_PAYEE_NAME = process.env.UPI_PAYEE_NAME || "CrankShaft";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, userId = "guest_user", items = [] } = body;

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 },
      );
    }

    await connectDB();

    // Verify and synchronize prices against live database products
    let verifiedAmount = 0;
    const verifiedItems: any[] = [];

    const itemProductIds = items
      .map((it: any) => it.id || it._id)
      .filter((id: any) => id && typeof id === "string" && id.length === 24);

    const dbProducts =
      itemProductIds.length > 0
        ? await Product.find({ _id: { $in: itemProductIds } }).lean()
        : [];

    const dbProductMap = new Map(
      dbProducts.map((p: any) => [String(p._id), p]),
    );

    for (const it of items) {
      const pid = it.id || it._id || "";
      const dbProd = dbProductMap.get(String(pid));
      const unitPrice = dbProd ? Number(dbProd.price) : Number(it.price) || 0;
      const qty = Math.max(1, Number(it.quantity) || 1);
      const category = (dbProd ? dbProd.category : it.category) || "General";
      verifiedAmount += unitPrice * qty;
      verifiedItems.push({
        productId: pid,
        name: dbProd ? dbProd.name : it.name || "Poster Artwork",
        price: unitPrice,
        quantity: qty,
        category,
        imageUrl: dbProd ? dbProd.imageUrl : it.imageUrl || "",
      });
    }

    // Use verified server amount if products were verified, otherwise fallback to parsedAmount
    const finalAmount =
      verifiedAmount > 0 ? parseFloat(verifiedAmount.toFixed(2)) : parsedAmount;

    // Generate unique internal Order ID
    const internalOrderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Initial micro-offset calculation (paisa offset for unique order matching)
    const randomOffsetPaisa = Math.floor(Math.random() * 90 + 10) / 1000; // e.g. 0.01 to 0.09
    const localExpectedAmount = parseFloat(
      (finalAmount + randomOffsetPaisa).toFixed(2),
    );

    // Fallback direct UPI Intent URI if UPIlerify service is offline
    const fallbackUpiIntent = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${localExpectedAmount}&cu=INR&tn=${encodeURIComponent(`Order ${internalOrderId}`)}`;
    const fallbackCheckoutUrl = `${APP_URL}/pay?orderId=${internalOrderId}`;

    // Create pending order in database
    const order = await Order.create({
      orderId: internalOrderId,
      userId,
      items: verifiedItems,
      amount: finalAmount,
      expectedAmount: localExpectedAmount,
      upiIntentUri: fallbackUpiIntent,
      checkoutUrl: fallbackCheckoutUrl,
      status: "PENDING",
      metadata: {
        merchantUpiId: UPI_ID,
        merchantName: UPI_PAYEE_NAME,
      },
    });

    let _upilerifyData: any = null;

    // Attempt to contact external self-hosted UPIlerify service
    if (UPILERIFY_URL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(`${UPILERIFY_URL}/api/orders/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: finalAmount,
            merchantUpiId: UPI_ID,
            merchantName: UPI_PAYEE_NAME,
            useMicroOffset: true,
            webhookUrl: `${APP_URL}/api/webhooks/upilerify`,
            metadata: { userId, orderId: order.orderId },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.order) {
            _upilerifyData = data;
            order.upilerifyOrderId = data.order.id;
            order.checkoutUrl = data.checkoutUrl || fallbackCheckoutUrl;
            order.upiIntentUri = data.upiIntentUri || fallbackUpiIntent;
            order.expectedAmount =
              data.order.expectedAmount || localExpectedAmount;
            await order.save();
          }
        }
      } catch (_upiErr) {
        // Log info that UPIlerify standalone server isn't reached yet; fallback is safely used
        console.warn(
          "[UPILERIFY_SERVICE] Standalone service not responding at",
          UPILERIFY_URL,
          "- using built-in intent fallback.",
        );
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      upilerifyOrderId: order.upilerifyOrderId || order.orderId,
      checkoutUrl: order.checkoutUrl,
      upiIntentUri: order.upiIntentUri,
      expectedAmount: order.expectedAmount,
      amount: order.amount,
    });
  } catch (err: any) {
    console.error("[CREATE_PAYMENT_ERROR]", err);
    return NextResponse.json(
      { error: err?.message || "Could not create payment" },
      { status: 500 },
    );
  }
}

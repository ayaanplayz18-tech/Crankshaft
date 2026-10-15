import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasAdminAccess } from "@/lib/auth";
import Order from "@/lib/models/Order";
import { connectDB } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !hasAdminAccess(session)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required." },
        { status: 403 },
      );
    }

    await connectDB();

    // Query paid merchandise/poster orders strictly (excluding shares receipts)
    const storePaidQuery = {
      status: "PAID",
      "metadata.type": { $ne: "shares" },
      "items.productId": { $ne: "shares" },
    };

    const paidOrders: any[] = await Order.find(storePaidQuery as any)
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();

    // Fetch store merchandise orders count strictly
    const allOrdersCount = await Order.countDocuments({
      "metadata.type": { $ne: "shares" },
      "items.productId": { $ne: "shares" },
    });
    const pendingOrdersCount = await Order.countDocuments({
      status: "PENDING",
      "metadata.type": { $ne: "shares" },
      "items.productId": { $ne: "shares" },
    });

    // Aggregate metrics
    const totalRevenue = paidOrders.reduce(
      (sum, ord) => sum + (ord.expectedAmount || ord.amount || 0),
      0,
    );
    const totalItemsSold = paidOrders.reduce((sum, ord) => {
      const itemCount = (ord.items || []).reduce(
        (iSum: number, it: any) => iSum + (it.quantity || 1),
        0,
      );
      return sum + itemCount;
    }, 0);

    return NextResponse.json({
      orders: paidOrders,
      stats: {
        totalRevenue,
        paidCount: paidOrders.length,
        allCount: allOrdersCount,
        pendingCount: pendingOrdersCount,
        totalItemsSold,
      },
    });
  } catch (err: any) {
    console.error("[ADMIN_ORDERS_GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

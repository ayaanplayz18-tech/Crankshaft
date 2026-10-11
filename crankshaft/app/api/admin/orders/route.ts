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

    // Query paid orders
    const paidOrders = await Order.find({ status: "PAID" })
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();

    // Also fetch all orders count if needed
    const allOrdersCount = await Order.countDocuments();
    const pendingOrdersCount = await Order.countDocuments({
      status: "PENDING",
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

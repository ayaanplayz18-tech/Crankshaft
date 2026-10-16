import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import Share from "@/lib/models/Share";
import { connectDB } from "@/lib/mongodb";
import { getShareConfig, TOTAL_SHARES } from "@/lib/shares";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Please log in to view your shares." },
        { status: 401 },
      );
    }

    await connectDB();
    const config = await getShareConfig();
    const currentPrice = config.pricePerShare;

    // Find all shares associated with this user
    const escapedUsername = session.username.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const shares = await Share.find({
      $or: [
        { userId: session.userId },
        { username: session.username },
        { username: { $regex: new RegExp(`^${escapedUsername}$`, "i") } },
      ],
    })
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();

    let totalPaidShares = 0;
    let marketShares = 0;
    let reservedShares = 0;
    let pendingShares = 0;
    let totalInvested = 0;

    const formattedShares = shares.map((sh) => {
      const count = Number(sh.numberOfShares) || 0;
      const isPaid = sh.status === "PAID";
      const isPending = sh.status === "PENDING";
      const pool = sh.pool === "reserved" ? "reserved" : "market";

      if (isPaid) {
        totalPaidShares += count;
        totalInvested += Number(sh.totalPrice) || count * currentPrice;
        if (pool === "reserved") {
          reservedShares += count;
        } else {
          marketShares += count;
        }
      } else if (isPending) {
        pendingShares += count;
      }

      return {
        id: sh._id.toString(),
        orderId: sh.orderId,
        username: sh.username,
        numberOfShares: count,
        stakePercent: parseFloat(((count / TOTAL_SHARES) * 100).toFixed(2)),
        totalPrice: sh.totalPrice,
        pricePerShare: sh.pricePerShare || currentPrice,
        currentMarketValue: count * currentPrice,
        pool,
        status: sh.status,
        utr: sh.utr,
        paidAt: sh.paidAt,
        createdAt: sh.createdAt,
      };
    });

    const stakePercent = parseFloat(
      ((totalPaidShares / TOTAL_SHARES) * 100).toFixed(2),
    );
    const currentValue = totalPaidShares * currentPrice;
    const estimatedDividendPayout =
      Math.round(totalPaidShares * (config.dividendPerShare || 0) * 100) / 100;

    return NextResponse.json({
      success: true,
      user: {
        userId: session.userId,
        username: session.username,
      },
      summary: {
        totalShares: totalPaidShares,
        marketShares,
        reservedShares,
        pendingShares,
        stakePercent,
        totalInvested,
        currentValue,
        currentPricePerShare: currentPrice,
        dividendPool: config.dividendPool,
        dividendPerShare: config.dividendPerShare,
        dividendYieldPercent: config.dividendYieldPercent,
        estimatedDividendPayout,
      },
      shares: formattedShares,
    });
  } catch (err: any) {
    console.error("[MY_SHARES_GET_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to fetch user shares" },
      { status: 500 },
    );
  }
}

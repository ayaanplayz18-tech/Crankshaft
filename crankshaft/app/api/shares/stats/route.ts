import { NextResponse } from "next/server";
import Share from "@/lib/models/Share";
import { connectDB } from "@/lib/mongodb";
import {
  calculateMarketValueFromCapital,
  getShareConfig,
  MAX_PUBLIC_SHARES,
  RESERVED_PERCENT,
  RESERVED_SHARES,
  SHARES_PER_PERCENT,
  TOTAL_SHARES,
} from "@/lib/shares";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await connectDB();
    const config = await getShareConfig();
    const pricePerShare = config.pricePerShare;

    // Group PAID shares by pool
    const result = await Share.aggregate([
      { $match: { status: "PAID" } },
      {
        $group: {
          _id: { $ifNull: ["$pool", "market"] },
          totalShares: { $sum: "$numberOfShares" },
        },
      },
    ]);

    let marketSold = 0;
    let reservedSold = 0;
    result.forEach((r) => {
      if (r._id === "reserved") reservedSold += r.totalShares;
      else marketSold += r.totalShares;
    });

    const availableMarketShares = Math.max(0, MAX_PUBLIC_SHARES - marketSold);
    const availableReservedShares = Math.max(0, RESERVED_SHARES - reservedSold);
    const totalSoldShares = marketSold + reservedSold;

    // Derived market value formula: Capital / (1,000 - availableShares)
    const derivedPrice = calculateMarketValueFromCapital(
      config.totalCapital,
      availableMarketShares,
    );

    // Percentage calculations out of TOTAL_SHARES (1,000)
    const marketSoldPercent = parseFloat(
      ((marketSold / TOTAL_SHARES) * 100).toFixed(2),
    );
    const reservedSoldPercent = parseFloat(
      ((reservedSold / TOTAL_SHARES) * 100).toFixed(2),
    );
    const remainingReservedPercent = parseFloat(
      ((availableReservedShares / TOTAL_SHARES) * 100).toFixed(2),
    );
    const availablePercent = parseFloat(
      ((availableMarketShares / TOTAL_SHARES) * 100).toFixed(2),
    );

    return NextResponse.json({
      totalShares: TOTAL_SHARES,
      totalCapital: config.totalCapital,
      soldShares: marketSold,
      availableShares: availableMarketShares,
      maxPublicShares: MAX_PUBLIC_SHARES,
      reservedShares: RESERVED_SHARES,
      reservedSoldShares: reservedSold,
      availableReservedShares,
      totalSoldShares,
      pricePerShare: derivedPrice,
      isMarketValueDerived: true,
      dividendPool: config.dividendPool,
      dividendPerShare: config.dividendPerShare,
      dividendYieldPercent: config.dividendYieldPercent,
      sharesPerPercent: SHARES_PER_PERCENT,
      soldPercent: marketSoldPercent,
      reservedPercent: remainingReservedPercent,
      reservedSoldPercent,
      availablePercent,
      totalCompanyValuation: config.totalCapital,
      publicPoolValuation: MAX_PUBLIC_SHARES * pricePerShare,
      reservedPoolValuation: RESERVED_SHARES * pricePerShare,
    });
  } catch (err) {
    console.error("[SHARES_STATS_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to fetch share stats" },
      { status: 500 },
    );
  }
}

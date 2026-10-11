import { NextResponse } from "next/server";
import Share from "@/lib/models/Share";
import { connectDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Constants
const TOTAL_SHARES = 1000; // 100% = 1000 shares (10 shares = 1%)
const RESERVED_PERCENT = 60; // 60% of total is gray/reserved
const MAX_PUBLIC_SHARES = Math.round(
  TOTAL_SHARES * (1 - RESERVED_PERCENT / 100),
); // 400 shares = 40%

export async function GET() {
  try {
    await connectDB();

    // Count all PAID shares
    const result = await Share.aggregate([
      { $match: { status: "PAID" } },
      { $group: { _id: null, totalShares: { $sum: "$numberOfShares" } } },
    ]);

    const soldShares = result[0]?.totalShares ?? 0;
    const availableShares = Math.max(0, MAX_PUBLIC_SHARES - soldShares);

    // Percentage calculations (out of TOTAL_SHARES to make the pie make sense)
    const soldPercent = parseFloat(
      ((soldShares / TOTAL_SHARES) * 100).toFixed(2),
    );
    const reservedPercent = RESERVED_PERCENT;
    const availablePercent = parseFloat(
      (100 - reservedPercent - soldPercent).toFixed(2),
    );

    return NextResponse.json({
      totalShares: TOTAL_SHARES,
      soldShares,
      availableShares,
      maxPublicShares: MAX_PUBLIC_SHARES,
      reservedShares: TOTAL_SHARES - MAX_PUBLIC_SHARES,
      pricePerShare: 20,
      sharesPerPercent: 10,
      soldPercent,
      reservedPercent,
      availablePercent: Math.max(0, availablePercent),
    });
  } catch (err) {
    console.error("[SHARES_STATS_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to fetch share stats" },
      { status: 500 },
    );
  }
}

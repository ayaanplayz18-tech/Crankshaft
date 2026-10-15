import { type NextRequest, NextResponse } from "next/server";
import {
  getSessionFromRequest,
  hasAdminAccess,
  isGhostSession,
} from "@/lib/auth";
import AdminLog from "@/lib/models/AdminLog";
import Order from "@/lib/models/Order";
import Share from "@/lib/models/Share";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/mongodb";
import {
  getShareConfig,
  getSharePrice,
  MAX_PUBLIC_SHARES,
  RESERVED_PERCENT,
  RESERVED_SHARES,
  TOTAL_SHARES,
  updateCompanyCapital,
} from "@/lib/shares";

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
    const shareConfig = await getShareConfig();
    const currentPrice = shareConfig.pricePerShare;

    // Fetch all PAID shares
    const paidShares = await Share.find({ status: "PAID" })
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();

    // Group shares by unique username
    // Group shares by unique username
    const userMap = new Map<
      string,
      {
        username: string;
        userId: string;
        totalShares: number;
        marketShares: number;
        reservedShares: number;
        poolLabel: "Market" | "Founders/Reserved" | "Mixed";
        stakePercent: number;
        totalInvested: number;
        currentMarketValue: number;
        ordersCount: number;
        firstGranted: Date | string;
        lastGranted: Date | string;
        records: any[];
      }
    >();

    let marketSoldShares = 0;
    let reservedSoldShares = 0;

    for (const sh of paidShares) {
      const uname = sh.username || "Anonymous";
      const existing = userMap.get(uname);
      const sharesCount = Number(sh.numberOfShares) || 0;
      const price = Number(sh.totalPrice) || sharesCount * currentPrice;
      const shPool = sh.pool === "reserved" ? "reserved" : "market";

      if (shPool === "reserved") {
        reservedSoldShares += sharesCount;
      } else {
        marketSoldShares += sharesCount;
      }

      if (!existing) {
        userMap.set(uname, {
          username: uname,
          userId: sh.userId || "",
          totalShares: sharesCount,
          marketShares: shPool === "market" ? sharesCount : 0,
          reservedShares: shPool === "reserved" ? sharesCount : 0,
          poolLabel: shPool === "reserved" ? "Founders/Reserved" : "Market",
          stakePercent: parseFloat((sharesCount / 10).toFixed(2)),
          totalInvested: price,
          currentMarketValue: sharesCount * currentPrice,
          ordersCount: 1,
          firstGranted: sh.paidAt || sh.createdAt,
          lastGranted: sh.paidAt || sh.createdAt,
          records: [sh],
        });
      } else {
        existing.totalShares += sharesCount;
        if (shPool === "reserved") {
          existing.reservedShares += sharesCount;
        } else {
          existing.marketShares += sharesCount;
        }
        if (existing.marketShares > 0 && existing.reservedShares > 0) {
          existing.poolLabel = "Mixed";
        } else if (existing.reservedShares > 0) {
          existing.poolLabel = "Founders/Reserved";
        } else {
          existing.poolLabel = "Market";
        }
        existing.stakePercent = parseFloat(
          (existing.totalShares / 10).toFixed(2),
        );
        existing.totalInvested += price;
        existing.currentMarketValue = existing.totalShares * currentPrice;
        existing.ordersCount += 1;
        existing.records.push(sh);
        if (new Date(sh.createdAt) < new Date(existing.firstGranted)) {
          existing.firstGranted = sh.createdAt;
        }
        if (
          new Date(sh.paidAt || sh.createdAt) > new Date(existing.lastGranted)
        ) {
          existing.lastGranted = sh.paidAt || sh.createdAt;
        }
      }
    }

    const stakeholders = Array.from(userMap.values()).sort(
      (a, b) => b.totalShares - a.totalShares,
    );

    const totalSoldShares = marketSoldShares + reservedSoldShares;
    const availableMarketShares = Math.max(
      0,
      MAX_PUBLIC_SHARES - marketSoldShares,
    );
    const availableReservedShares = Math.max(
      0,
      RESERVED_SHARES - reservedSoldShares,
    );
    const totalAvailableShares =
      availableMarketShares + availableReservedShares;
    const totalRevenue = stakeholders.reduce(
      (sum, s) => sum + s.totalInvested,
      0,
    );

    return NextResponse.json({
      success: true,
      stakeholders,
      rawShares: paidShares,
      stats: {
        totalShares: TOTAL_SHARES,
        maxPublicShares: MAX_PUBLIC_SHARES,
        marketAllocated: marketSoldShares,
        marketRemaining: availableMarketShares,
        reservedTotal: RESERVED_SHARES,
        reservedAllocated: reservedSoldShares,
        reservedRemaining: availableReservedShares,
        totalAllocated: totalSoldShares,
        totalRemaining: totalAvailableShares,
        soldShares: marketSoldShares,
        availableShares: availableMarketShares,
        marketPercent: parseFloat(
          ((marketSoldShares / TOTAL_SHARES) * 100).toFixed(2),
        ),
        reservedPercent: parseFloat(
          ((reservedSoldShares / TOTAL_SHARES) * 100).toFixed(2),
        ),
        totalSoldPercent: parseFloat(
          ((totalSoldShares / TOTAL_SHARES) * 100).toFixed(2),
        ),
        stakeholderCount: stakeholders.length,
        totalRevenue,
        pricePerShare: currentPrice,
        totalCapital: shareConfig.totalCapital,
        isMarketValueDerived: true,
        marketValueFormula: "Total Capital / 1,000 shares",
        dividendPool: shareConfig.dividendPool,
        dividendPerShare: shareConfig.dividendPerShare,
        dividendYieldPercent: shareConfig.dividendYieldPercent,
        reasonForChange: shareConfig.reasonForChange,
        changeHistory: shareConfig.changeHistory,
        totalCompanyValuation: shareConfig.totalCapital,
        publicPoolValuation: MAX_PUBLIC_SHARES * currentPrice,
        reservedPoolValuation: RESERVED_SHARES * currentPrice,
        soldPoolValuation: totalSoldShares * currentPrice,
      },
    });
  } catch (err: any) {
    console.error("[ADMIN_SHARES_GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch shares" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !hasAdminAccess(session)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { username, shares, notes = "", pool = "market" } = body;
    const targetPool: "market" | "reserved" =
      pool === "reserved" ? "reserved" : "market";

    if (!username || typeof username !== "string" || !username.trim()) {
      return NextResponse.json(
        { error: "Username or stakeholder name is required" },
        { status: 400 },
      );
    }

    const parsedShares = parseInt(shares, 10);
    if (Number.isNaN(parsedShares) || parsedShares < 1) {
      return NextResponse.json(
        { error: "Number of shares must be at least 1" },
        { status: 400 },
      );
    }

    await connectDB();

    const cleanUsername = username.trim();

    // Check available shares according to selected pool
    const poolAgg = await Share.aggregate([
      { $match: { status: "PAID" } },
      {
        $group: {
          _id: { $ifNull: ["$pool", "market"] },
          total: { $sum: "$numberOfShares" },
        },
      },
    ]);
    let currentMarketSold = 0;
    let currentReservedSold = 0;
    poolAgg.forEach((p) => {
      if (p._id === "reserved") currentReservedSold += p.total;
      else currentMarketSold += p.total;
    });

    if (targetPool === "reserved") {
      const remainingReserved = RESERVED_SHARES - currentReservedSold;
      if (parsedShares > remainingReserved) {
        return NextResponse.json(
          {
            error: `Cannot grant ${parsedShares} shares from Founders/Reserved pool. Only ${remainingReserved} reserved shares are available (${currentReservedSold}/${RESERVED_SHARES} allocated).`,
          },
          { status: 400 },
        );
      }
    } else {
      const remainingPublic = MAX_PUBLIC_SHARES - currentMarketSold;
      if (parsedShares > remainingPublic) {
        return NextResponse.json(
          {
            error: `Cannot grant ${parsedShares} shares from Market pool. Only ${remainingPublic} market shares are available (${currentMarketSold}/${MAX_PUBLIC_SHARES} allocated).`,
          },
          { status: 400 },
        );
      }
    }

    // Try to find registered user to link userId
    const matchedUser = await User.findOne({ username: cleanUsername }).lean();
    const resolvedUserId = matchedUser
      ? String(matchedUser._id)
      : `manual_${Date.now()}`;

    const currentPrice = await getSharePrice();
    const orderId = `man_shr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const totalPrice = parsedShares * currentPrice;
    const poolTitle =
      targetPool === "reserved" ? "Founders/Reserved Pool" : "Market Pool";
    const utrLabel = notes.trim()
      ? `MANUAL_GRANT [${poolTitle}]: ${notes.trim().substring(0, 30)}`
      : `MANUAL_GRANT [${poolTitle}] by @${session.username}`;

    // Create the Share record
    const share = await Share.create({
      userId: resolvedUserId,
      username: cleanUsername,
      phone: matchedUser?.phone || undefined,
      numberOfShares: parsedShares,
      totalPrice,
      pricePerShare: currentPrice,
      pool: targetPool,
      orderId,
      utr: utrLabel,
      status: "PAID",
      paidAt: new Date(),
    });

    // Also record in Order collection for centralized financial tracking
    await Order.create({
      orderId,
      userId: resolvedUserId,
      items: [
        {
          productId: "shares",
          name: `CrankShaft Profit Shares × ${parsedShares} (${poolTitle})`,
          price: currentPrice,
          quantity: parsedShares,
        },
      ],
      amount: totalPrice,
      expectedAmount: totalPrice,
      status: "PAID",
      utr: utrLabel,
      paidAt: new Date(),
      metadata: {
        type: "shares",
        pool: targetPool,
        numberOfShares: parsedShares,
        username: cleanUsername,
        grantedBy: session.username,
        notes: notes.trim(),
        isManualGrant: true,
        pricePerShare: currentPrice,
      },
    });

    const isTargetGhost = Boolean(
      matchedUser && (matchedUser.role as string) === "ghost",
    );

    // Log command in Admin Terminal (suppressed for ghost role)
    if (!(await isGhostSession(session)) && !isTargetGhost) {
      const stakePercent = (parsedShares / 10).toFixed(1);
      await AdminLog.create({
        adminName: session.username,
        command: `${session.username} manually added ${parsedShares} shares (${stakePercent}% equity) [${poolTitle}] to @${cleanUsername}${notes ? ` [${notes.trim()}]` : ""} at ₹${currentPrice}/share`,
        actionType: "SHARES_GRANT",
        metadata: {
          shareId: share._id,
          orderId,
          pool: targetPool,
          username: cleanUsername,
          numberOfShares: parsedShares,
          stakePercent: parsedShares / 10,
          totalPrice,
          pricePerShare: currentPrice,
          notes: notes.trim(),
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully allocated ${parsedShares} shares (${(parsedShares / 10).toFixed(1)}% stake) to @${cleanUsername}`,
        share,
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("[ADMIN_SHARES_POST]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to add shares" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !hasAdminAccess(session)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required." },
        { status: 403 },
      );
    }

    const body = await req.json();

    // Reject direct attempts to override market value
    if (
      body.pricePerShare !== undefined &&
      body.totalCapital === undefined &&
      body.capital === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Market value per share is strictly non-editable. It is mathematically derived from the company capital (Market Value = Total Capital ÷ 1,000 shares). Please update the company capital instead.",
          formula: "Market Value = Total Capital / 1,000 shares",
        },
        { status: 400 },
      );
    }

    const rawCapital = body.totalCapital ?? body.capital;
    const rawReason = body.reason ?? body.changeReason ?? body.reasonForChange;
    const rawDividendPool = body.dividendPool;

    // Validate mandatory reason for change
    if (
      !rawReason ||
      typeof rawReason !== "string" ||
      !rawReason.trim() ||
      rawReason.trim().length < 3
    ) {
      return NextResponse.json(
        {
          error:
            "A reason for changing the company capital is strictly required for financial auditing and governance.",
        },
        { status: 400 },
      );
    }

    const parsedCapital = parseFloat(rawCapital);
    if (
      Number.isNaN(parsedCapital) ||
      parsedCapital <= 0 ||
      !Number.isFinite(parsedCapital)
    ) {
      return NextResponse.json(
        {
          error:
            "Total company capital must be a positive number greater than 0.",
        },
        { status: 400 },
      );
    }

    const parsedDividend =
      rawDividendPool !== undefined &&
      !Number.isNaN(parseFloat(rawDividendPool))
        ? Math.max(0, parseFloat(rawDividendPool))
        : undefined;

    const {
      previousCapital,
      currentCapital,
      previousMarketValue,
      currentMarketValue,
      reason,
      setting,
    } = await updateCompanyCapital(
      parsedCapital,
      rawReason.trim(),
      session.username,
      parsedDividend,
    );

    const isGhost = await isGhostSession(session);
    if (!isGhost) {
      await AdminLog.create({
        adminName: session.username,
        command: `${session.username} updated company capital: ₹${previousCapital.toLocaleString()} → ₹${currentCapital.toLocaleString()} (Derived Market Value: ₹${previousMarketValue} → ₹${currentMarketValue}/share). Reason: "${reason}"`,
        actionType: "SETTING_UPDATE",
        metadata: {
          type: "company_capital_update",
          previousCapital,
          currentCapital,
          previousMarketValue,
          currentMarketValue,
          reason,
          dividendPool: setting.dividendPool,
          updatedBy: session.username,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Company capital updated to ₹${currentCapital.toLocaleString()}. Derived market value: ₹${currentMarketValue}/share.`,
      totalCapital: currentCapital,
      pricePerShare: currentMarketValue,
      isMarketValueDerived: true,
      marketValueFormula: "Market Value = Total Capital / 1,000 shares",
      previousCapital,
      previousMarketValue,
      reason,
      dividendPool: setting.dividendPool,
      totalCompanyValuation: currentCapital,
      publicPoolValuation: currentMarketValue * MAX_PUBLIC_SHARES,
      reservedPoolValuation: currentMarketValue * RESERVED_SHARES,
      changeHistory: setting.changeHistory,
    });
  } catch (err: any) {
    console.error("[ADMIN_SHARES_PATCH]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update company capital" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !hasAdminAccess(session)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Share ID is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const share = await Share.findById(id);

    if (!share) {
      return NextResponse.json(
        { error: "Share record not found" },
        { status: 404 },
      );
    }

    const { username, numberOfShares, orderId } = share;
    await Share.findByIdAndDelete(id);

    // Also update order if found
    await Order.findOneAndUpdate({ orderId }, { status: "FAILED" });

    // Terminal command log (suppressed for ghost role)
    const isTargetGhost = Boolean(
      await User.exists({ username, role: "ghost" }),
    );

    if (!(await isGhostSession(session)) && !isTargetGhost) {
      await AdminLog.create({
        adminName: session.username,
        command: `${session.username} revoked ${numberOfShares} shares from @${username} (Order: ${orderId})`,
        actionType: "SHARES_REVOKE",
        metadata: { shareId: id, orderId, username, numberOfShares },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Revoked ${numberOfShares} shares from @${username}`,
    });
  } catch (err: any) {
    console.error("[ADMIN_SHARES_DELETE]", err);
    return NextResponse.json(
      { error: "Failed to revoke share" },
      { status: 500 },
    );
  }
}

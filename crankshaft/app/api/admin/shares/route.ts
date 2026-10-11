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

const TOTAL_SHARES = 1000;
const RESERVED_PERCENT = 60;
const MAX_PUBLIC_SHARES = 400; // 40%

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

    // Fetch all PAID shares
    const paidShares = await Share.find({ status: "PAID" })
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();

    // Group shares by unique username
    const userMap = new Map<
      string,
      {
        username: string;
        userId: string;
        totalShares: number;
        stakePercent: number;
        totalInvested: number;
        ordersCount: number;
        firstGranted: Date | string;
        lastGranted: Date | string;
        records: any[];
      }
    >();

    for (const sh of paidShares) {
      const uname = sh.username || "Anonymous";
      const existing = userMap.get(uname);
      const sharesCount = Number(sh.numberOfShares) || 0;
      const price = Number(sh.totalPrice) || sharesCount * 20;

      if (!existing) {
        userMap.set(uname, {
          username: uname,
          userId: sh.userId || "",
          totalShares: sharesCount,
          stakePercent: parseFloat((sharesCount / 10).toFixed(2)),
          totalInvested: price,
          ordersCount: 1,
          firstGranted: sh.paidAt || sh.createdAt,
          lastGranted: sh.paidAt || sh.createdAt,
          records: [sh],
        });
      } else {
        existing.totalShares += sharesCount;
        existing.stakePercent = parseFloat(
          (existing.totalShares / 10).toFixed(2),
        );
        existing.totalInvested += price;
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

    const totalSoldShares = stakeholders.reduce(
      (sum, s) => sum + s.totalShares,
      0,
    );
    const availableShares = Math.max(0, MAX_PUBLIC_SHARES - totalSoldShares);
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
        reservedShares: TOTAL_SHARES - MAX_PUBLIC_SHARES,
        maxPublicShares: MAX_PUBLIC_SHARES,
        soldShares: totalSoldShares,
        availableShares,
        soldPercent: parseFloat(
          ((totalSoldShares / TOTAL_SHARES) * 100).toFixed(2),
        ),
        reservedPercent: RESERVED_PERCENT,
        availablePercent: parseFloat(
          Math.max(0, 40 - (totalSoldShares / TOTAL_SHARES) * 100).toFixed(2),
        ),
        stakeholderCount: stakeholders.length,
        totalRevenue,
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
    const { username, shares, notes = "" } = body;

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

    // Check available public shares
    const currentSoldAgg = await Share.aggregate([
      { $match: { status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$numberOfShares" } } },
    ]);
    const currentSold = currentSoldAgg[0]?.total ?? 0;
    const remainingPublic = MAX_PUBLIC_SHARES - currentSold;

    if (parsedShares > remainingPublic) {
      return NextResponse.json(
        {
          error: `Cannot grant ${parsedShares} shares. Only ${remainingPublic} public shares are available (${currentSold}/400 allocated).`,
        },
        { status: 400 },
      );
    }

    // Try to find registered user to link userId
    const matchedUser = await User.findOne({ username: cleanUsername }).lean();
    const resolvedUserId = matchedUser
      ? String(matchedUser._id)
      : `manual_${Date.now()}`;

    const orderId = `man_shr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const totalPrice = parsedShares * 20;
    const utrLabel = notes.trim()
      ? `MANUAL_GRANT: ${notes.trim().substring(0, 40)}`
      : `MANUAL_ADMIN_GRANT by @${session.username}`;

    // Create the Share record
    const share = await Share.create({
      userId: resolvedUserId,
      username: cleanUsername,
      phone: matchedUser?.phone || undefined,
      numberOfShares: parsedShares,
      totalPrice,
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
          name: `CrankShaft Profit Shares × ${parsedShares} (Manual Grant)`,
          price: 20,
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
        numberOfShares: parsedShares,
        username: cleanUsername,
        grantedBy: session.username,
        notes: notes.trim(),
        isManualGrant: true,
      },
    });

    const isTargetGhost =
      cleanUsername === "ayaan_admin" ||
      (matchedUser && (matchedUser.role as string) === "ghost");

    // Log command in Admin Terminal (suppressed for ghost role)
    if (!(await isGhostSession(session)) && !isTargetGhost) {
      const stakePercent = (parsedShares / 10).toFixed(1);
      await AdminLog.create({
        adminName: session.username,
        command: `${session.username} manually added ${parsedShares} shares (${stakePercent}% equity) to @${cleanUsername}${notes ? ` [${notes.trim()}]` : ""}`,
        actionType: "SHARES_GRANT",
        metadata: {
          shareId: share._id,
          orderId,
          username: cleanUsername,
          numberOfShares: parsedShares,
          stakePercent: parsedShares / 10,
          totalPrice,
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
    const isTargetGhost =
      username === "ayaan_admin" ||
      (await User.exists({ username, role: "ghost" }));

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

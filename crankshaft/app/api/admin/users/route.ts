import { type NextRequest, NextResponse } from "next/server";
import {
  checkAdminAccess,
  getSessionFromRequest,
  hasAdminAccess,
  isGhostSession,
} from "@/lib/auth";
import AdminLog from "@/lib/models/AdminLog";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !(await checkAdminAccess(session))) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required." },
        { status: 403 },
      );
    }

    await connectDB();
    // Ghost users are strictly hidden and not shown on the user tab
    const users = await User.find({
      role: { $ne: "ghost" },
      username: { $nin: ["ayaan_admin", "Ayaan_Admin"] },
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users });
  } catch (err: unknown) {
    console.error("[ADMIN_USERS_GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !(await checkAdminAccess(session))) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required." },
        { status: 403 },
      );
    }

    const { userId, role } = await req.json();

    // Admins cannot change anyone's role to ghost - it has to be done via MongoDB Compass
    if (!userId || !role || !["user", "admin"].includes(role)) {
      return NextResponse.json(
        {
          error:
            "Valid userId and role ('user' | 'admin') are required. Ghost role cannot be set via dashboard.",
        },
        { status: 400 },
      );
    }

    await connectDB();
    const targetUser = await User.findById(userId);

    // If target user is not found or is a ghost, forbid modification
    if (!targetUser || targetUser.role === "ghost") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const oldRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    // Whatever ghost does will not show in the terminal
    if (!(await isGhostSession(session))) {
      await AdminLog.create({
        adminName: session.username,
        command: `${session.username} changed the role of ${targetUser.username} from ${oldRole} to ${role}`,
        actionType: "ROLE_UPDATE",
        metadata: {
          targetUserId: targetUser._id,
          targetUsername: targetUser.username,
          oldRole,
          newRole: role,
        },
      });
    }

    return NextResponse.json({
      message: `User role successfully updated to ${role}`,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role,
      },
    });
  } catch (err: unknown) {
    console.error("[ADMIN_USERS_PATCH]", err);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 },
    );
  }
}

import { type NextRequest, NextResponse } from "next/server";
import {
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
    if (!session || !hasAdminAccess(session)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required." },
        { status: 403 },
      );
    }

    await connectDB();

    const isOwnerOrMasterAdmin =
      session.username === "ayaan_admin" ||
      session.username === "ayaan_syed" ||
      session.role === "admin";

    let query: any = {};

    if (!isOwnerOrMasterAdmin) {
      // For restricted accounts, hide internal ghost accounts if any
      const ghostUsers = await User.find({ role: "ghost" }).distinct(
        "username",
      );
      if (ghostUsers.length > 0) {
        query = {
          adminName: { $nin: ghostUsers },
          "metadata.role": { $ne: "ghost" },
          "metadata.username": { $nin: ghostUsers },
          "metadata.adminName": { $nin: ghostUsers },
          "metadata.grantedBy": { $nin: ghostUsers },
        };
        const escaped = ghostUsers
          .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|");
        query.command = { $not: new RegExp(`(${escaped})`, "i") };
      }
    }

    const logs = await AdminLog.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ logs });
  } catch (err: unknown) {
    console.error("[ADMIN_TERMINAL_GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch terminal logs" },
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

    const { customCommand } = await req.json();
    if (!customCommand) {
      return NextResponse.json(
        { error: "Command string required" },
        { status: 400 },
      );
    }

    await connectDB();
    const log = await AdminLog.create({
      adminName: session.username,
      command: `${session.username}: ${customCommand}`,
      actionType: "SYSTEM",
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (err: unknown) {
    console.error("[ADMIN_TERMINAL_POST]", err);
    return NextResponse.json(
      { error: "Failed to log command" },
      { status: 500 },
    );
  }
}

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

    // Query all usernames that have role 'ghost' in the database
    const ghostUsers = await User.find({ role: "ghost" }).distinct("username");
    const ghostNames = Array.from(new Set([...ghostUsers, "ayaan_admin"]));

    // Strict filter: exclude all logs created by, targeting, or mentioning any ghost user
    const query: any = {
      adminName: { $nin: ghostNames },
      "metadata.role": { $ne: "ghost" },
      "metadata.username": { $nin: ghostNames },
      "metadata.adminName": { $nin: ghostNames },
      "metadata.grantedBy": { $nin: ghostNames },
    };

    if (ghostNames.length > 0) {
      const escaped = ghostNames
        .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");
      query.command = { $not: new RegExp(`(${escaped})`, "i") };
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

    // Whatever ghost does will not show in the terminal
    if (await isGhostSession(session)) {
      return NextResponse.json(
        {
          log: {
            _id: `ghost_${Date.now()}`,
            adminName: session.username,
            command: `${session.username}: ${customCommand}`,
            actionType: "SYSTEM",
            createdAt: new Date().toISOString(),
          },
          ghost: true,
        },
        { status: 201 },
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

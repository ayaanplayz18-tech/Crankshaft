import { type NextRequest, NextResponse } from "next/server";
import AdminLog from "@/lib/models/AdminLog";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ username: username.trim() });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const previousRole = user.role;
    user.role = "admin";
    await user.save();

    if (
      (previousRole as string) !== "ghost" &&
      user.username !== "ayaan_admin"
    ) {
      await AdminLog.create({
        adminName: "System",
        command: `System elevated user "${user.username}" to admin role`,
        actionType: "ROLE_UPDATE",
      });
    }

    return NextResponse.json({
      message: `User "${user.username}" successfully elevated to admin`,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    console.error("[ADMIN_SETUP]", err);
    return NextResponse.json(
      { error: "Failed to promote user" },
      { status: 500 },
    );
  }
}

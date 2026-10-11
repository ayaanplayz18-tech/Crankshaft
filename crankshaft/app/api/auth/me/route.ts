import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ user: null });
    }

    await connectDB();
    const user = await User.findById(session.userId).select("-password");

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        phone: user.phone,
        role: user.role,
        authProvider: user.authProvider || "credentials",
      },
    });
  } catch (err: unknown) {
    console.error("[AUTH_ME]", err);
    return NextResponse.json({ user: null });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ message: "Logged out" });
  res.cookies.delete("crankshaft_token");
  return res;
}

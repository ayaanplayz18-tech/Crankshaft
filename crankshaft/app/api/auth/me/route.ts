import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, signToken } from "@/lib/auth";
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

    const res = NextResponse.json({
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

    // If role in DB changed (e.g. via MongoDB Compass), auto-refresh the JWT cookie
    if (user.role !== session.role || user.username !== session.username) {
      const refreshedToken = signToken({
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
      });
      res.cookies.set("crankshaft_token", refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return res;
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

import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/mongodb";

import { validateLoginIdentifier } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 },
      );
    }

    const validation = validateLoginIdentifier(username);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const trimmedInput = username.trim();

    await connectDB();

    // Check if input might be a 10-digit phone or phone with +91
    const cleanDigits = trimmedInput.replace(/^\+91/, "").replace(/\D/g, "");
    const possiblePhone =
      cleanDigits.length === 10 ? `+91${cleanDigits}` : null;
    const escapedInput = trimmedInput.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ── Find user by case-insensitive username or phone ──
    const searchConditions: any[] = [
      { username: { $regex: new RegExp(`^${escapedInput}$`, "i") } },
    ];
    if (possiblePhone) {
      searchConditions.push({ phone: possiblePhone });
    }

    const user = await User.findOne({
      $or: searchConditions,
    }).select("+password");

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 },
      );
    }

    // ── Verify password ──
    if (!user.password) {
      return NextResponse.json(
        {
          error:
            "This account was created with Google. Please click 'Continue with Google' to sign in.",
        },
        { status: 400 },
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 },
      );
    }

    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    });

    const res = NextResponse.json(
      {
        message: "Login successful.",
        user: {
          id: user._id,
          username: user.username,
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 200 },
    );

    res.cookies.set("crankshaft_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err: unknown) {
    console.error("[LOGIN]", err);
    return NextResponse.json(
      {
        error:
          "Something went wrong while logging in. Please check database connection.",
      },
      { status: 500 },
    );
  }
}

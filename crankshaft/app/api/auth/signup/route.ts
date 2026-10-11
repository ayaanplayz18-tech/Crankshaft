import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, phone } = body;

    // ── Input validation ──
    if (!username || !password || !phone) {
      return NextResponse.json(
        { error: "Username, password, and phone number are required." },
        { status: 400 },
      );
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    // Phone parsing: accept 10 digits
    const digitsOnly = phone.toString().replace(/^\+91/, "").replace(/\D/g, "");
    if (digitsOnly.length !== 10) {
      return NextResponse.json(
        {
          error:
            "Phone number must be exactly 10 digits (with +91 country code).",
        },
        { status: 400 },
      );
    }

    const fullPhone = `+91${digitsOnly}`;

    await connectDB();

    // ── Duplicate check ──
    const existing = await User.findOne({
      $or: [{ username: trimmedUsername }, { phone: fullPhone }],
    });

    if (existing) {
      const field =
        existing.username.toLowerCase() === trimmedUsername.toLowerCase()
          ? "Username"
          : "Phone number";
      return NextResponse.json(
        { error: `${field} is already registered.` },
        { status: 409 },
      );
    }

    // First registered account is admin; all subsequent are 'user' (user cannot choose)
    const userCount = await User.countDocuments();
    const assignedRole: "admin" | "user" = userCount === 0 ? "admin" : "user";

    // ── Hash password ──
    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Create user ──
    const user = await User.create({
      username: trimmedUsername,
      password: hashedPassword,
      phone: fullPhone,
      role: assignedRole,
    });

    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    });

    const res = NextResponse.json(
      {
        message: "Account created successfully.",
        userId: user._id,
        user: {
          id: user._id,
          username: user.username,
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 201 },
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
    console.error("[SIGNUP]", err);
    return NextResponse.json(
      {
        error:
          "Something went wrong while creating account. Please verify database connection.",
      },
      { status: 500 },
    );
  }
}

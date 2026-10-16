import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/mongodb";

import {
  validateIndianPhone,
  validatePassword,
  validateUsername,
} from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, phone } = body;

    // ── Input validation ──
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return NextResponse.json(
        { error: usernameValidation.error },
        { status: 400 },
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 },
      );
    }

    const phoneValidation = validateIndianPhone(phone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { error: phoneValidation.error },
        { status: 400 },
      );
    }

    const trimmedUsername = username.trim();
    const digitsOnly = phone.toString().replace(/^\+91/, "").replace(/\D/g, "");
    const fullPhone = `+91${digitsOnly}`;

    await connectDB();

    // ── Duplicate check (case-insensitive username & phone) ──
    const escapedUsername = trimmedUsername.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const existing = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${escapedUsername}$`, "i") } },
        { phone: fullPhone },
      ],
    });

    if (existing) {
      const isUsernameMatch =
        existing.username.toLowerCase() === trimmedUsername.toLowerCase();
      return NextResponse.json(
        {
          error: isUsernameMatch
            ? "Username is already registered. Please choose another."
            : "Phone number is already registered.",
        },
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

import { type NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, email, displayName, photoURL } = body;

    if (!uid || !email) {
      return NextResponse.json(
        {
          error:
            "Google authentication payload is missing required credentials.",
        },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    await connectDB();

    // 1. Search for existing user with matching Google ID or Email
    let user = await User.findOne({
      $or: [{ googleId: uid }, { email: cleanEmail }],
    });

    if (user) {
      let isModified = false;

      // Link googleId if missing
      if (!user.googleId) {
        user.googleId = uid;
        isModified = true;
      }

      // Update avatar if not present
      if (photoURL && (!user.avatar || user.avatar !== photoURL)) {
        user.avatar = photoURL;
        isModified = true;
      }

      if (isModified) {
        await user.save();
      }
    } else {
      // 2. New User Signup via Google
      // Generate unique username based on displayName or email prefix
      let baseHandle = "";
      if (displayName) {
        baseHandle = displayName
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "")
          .substring(0, 20);
      }

      if (!baseHandle || baseHandle.length < 3) {
        baseHandle = cleanEmail
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "")
          .substring(0, 20);
      }

      if (!baseHandle || baseHandle.length < 3) {
        baseHandle = `user_${Math.random().toString(36).substring(2, 7)}`;
      }

      // Check handle collision and generate unique username if needed
      let candidateUsername = baseHandle;
      let suffix = 1;
      while (await User.exists({ username: candidateUsername })) {
        const rand = Math.floor(100 + Math.random() * 900);
        candidateUsername = `${baseHandle.substring(0, 16)}_${rand || suffix++}`;
      }

      // First registered user becomes admin, all others are normal user
      const userCount = await User.countDocuments();
      const assignedRole: "admin" | "user" = userCount === 0 ? "admin" : "user";

      user = await User.create({
        username: candidateUsername,
        email: cleanEmail,
        googleId: uid,
        avatar: photoURL || undefined,
        authProvider: "google",
        role: assignedRole,
      });
    }

    // 3. Issue session token
    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    });

    const res = NextResponse.json(
      {
        message: "Google authentication successful.",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          phone: user.phone,
          role: user.role,
          authProvider: user.authProvider || "google",
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
    console.error("[AUTH_GOOGLE_POST]", err);
    return NextResponse.json(
      { error: "Failed to authenticate with Google. Please try again." },
      { status: 500 },
    );
  }
}

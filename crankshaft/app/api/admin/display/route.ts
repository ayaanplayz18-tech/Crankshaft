import { type NextRequest, NextResponse } from "next/server";
import {
  getSessionFromRequest,
  hasAdminAccess,
  isGhostSession,
} from "@/lib/auth";
import AdminLog from "@/lib/models/AdminLog";
import DisplaySetting from "@/lib/models/DisplaySetting";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectDB();
    let setting = await DisplaySetting.findOne({ key: "home_poster" });

    if (!setting) {
      setting = await DisplaySetting.create({
        key: "home_poster",
        posterUrl: "/poster-ex.png",
        posterName: "Default CrankShaft Poster",
        updatedBy: "System",
      });
    }

    return NextResponse.json({ display: setting });
  } catch (err: unknown) {
    console.error("[DISPLAY_GET]", err);
    return NextResponse.json({
      display: {
        key: "home_poster",
        posterUrl: "/poster-ex.png",
        posterName: "Default CrankShaft Poster",
        updatedBy: "System",
      },
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !hasAdminAccess(session)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required." },
        { status: 403 },
      );
    }

    const { posterUrl, posterName } = await req.json();

    if (!posterUrl) {
      return NextResponse.json(
        { error: "Poster URL is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const setting = await DisplaySetting.findOneAndUpdate(
      { key: "home_poster" },
      {
        posterUrl,
        posterName: posterName || "Updated Poster",
        updatedBy: session.username,
      },
      { upsert: true, new: true },
    );

    // Terminal command log (suppressed for ghost role)
    if (!(await isGhostSession(session))) {
      await AdminLog.create({
        adminName: session.username,
        command: `${session.username} changed the Display poster to "${posterName || "New Poster"}"`,
        actionType: "DISPLAY_UPDATE",
        metadata: { posterUrl, posterName },
      });
    }

    return NextResponse.json({
      message: "Display poster updated successfully",
      display: setting,
    });
  } catch (err: unknown) {
    console.error("[DISPLAY_PUT]", err);
    return NextResponse.json(
      { error: "Failed to update display poster" },
      { status: 500 },
    );
  }
}

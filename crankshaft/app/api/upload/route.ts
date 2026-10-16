import { Readable } from "node:stream";
import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasAdminAccess } from "@/lib/auth";
import { getGridFSBucket } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !hasAdminAccess(session)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required." },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "Image exceeds 15MB size limit. Please upload a smaller image.",
        },
        { status: 413 },
      );
    }

    const bucket = await getGridFSBucket();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const readableStream = Readable.from(buffer);

    const uploadStream = bucket.openUploadStream(safeFilename, {
      metadata: {
        contentType: file.type || "image/jpeg",
        originalName: file.name,
        uploadedBy: session.username,
        size: file.size,
      },
    });

    await new Promise<void>((resolve, reject) => {
      readableStream
        .pipe(uploadStream)
        .on("error", reject)
        .on("finish", () => resolve());
    });

    const fileId = uploadStream.id.toString();
    const url = `/api/images/${fileId}`;

    return NextResponse.json({
      message: "File uploaded successfully via GridFS",
      fileId,
      url,
      filename: safeFilename,
    });
  } catch (err: unknown) {
    console.error("[GRIDFS_UPLOAD]", err);
    return NextResponse.json(
      { error: "Failed to upload file to GridFS" },
      { status: 500 },
    );
  }
}

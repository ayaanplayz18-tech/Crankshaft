import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";
import { getGridFSBucket } from "@/lib/mongodb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    const bucket = await getGridFSBucket();
    const objectId = new ObjectId(id);

    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const fileDoc = files[0];
    const metadata = fileDoc.metadata as Record<string, any> | undefined;
    const contentType = metadata?.contentType || "image/jpeg";

    const downloadStream = bucket.openDownloadStream(objectId);

    // Convert downloadStream to Web ReadableStream
    const readable = new ReadableStream({
      start(controller) {
        downloadStream.on("data", (chunk) => controller.enqueue(chunk));
        downloadStream.on("end", () => controller.close());
        downloadStream.on("error", (err) => controller.error(err));
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    console.error("[GRIDFS_GET]", err);
    return NextResponse.json(
      { error: "Failed to retrieve image" },
      { status: 500 },
    );
  }
}

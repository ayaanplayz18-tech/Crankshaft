import { type NextRequest, NextResponse } from "next/server";
import {
  getSessionFromRequest,
  hasAdminAccess,
  isGhostSession,
} from "@/lib/auth";
import AdminLog from "@/lib/models/AdminLog";
import Product from "@/lib/models/Product";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ products });
  } catch (err: unknown) {
    console.error("[PRODUCTS_GET]", err);
    return NextResponse.json({ products: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !hasAdminAccess(session)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required." },
        { status: 403 },
      );
    }

    const { name, price, category, imageId, imageUrl } = await req.json();

    if (!name || price === undefined || !imageUrl) {
      return NextResponse.json(
        { error: "Name, price, and image are required." },
        { status: 400 },
      );
    }

    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "Valid price is required." },
        { status: 400 },
      );
    }

    const cleanCategory =
      category && typeof category === "string" && category.trim()
        ? category.trim()
        : "Classic";

    await connectDB();
    const product = await Product.create({
      name: name.trim(),
      price: parsedPrice,
      category: cleanCategory,
      imageId: imageId || "gridfs_file",
      imageUrl,
    });

    // Terminal command log (suppressed for ghost role)
    if (!(await isGhostSession(session))) {
      await AdminLog.create({
        adminName: session.username,
        command: `${session.username} added product "${product.name}" (${product.category}) at ₹${product.price.toFixed(2)}`,
        actionType: "PRODUCT_CREATE",
        metadata: {
          productId: product._id,
          name: product.name,
          category: product.category,
          price: product.price,
        },
      });
    }

    return NextResponse.json(
      {
        message: "Product created successfully",
        product,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("[PRODUCTS_POST]", err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
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

    const { id, name, price, category, imageId, imageUrl } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const oldName = product.name;
    const oldPrice = product.price;
    const oldCategory = product.category;
    const oldImageUrl = product.imageUrl;

    if (name && typeof name === "string") {
      product.name = name.trim();
    }

    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (!Number.isNaN(parsedPrice) && parsedPrice >= 0) {
        product.price = parsedPrice;
      }
    }

    if (category && typeof category === "string") {
      product.category = category.trim();
    }

    if (imageId) product.imageId = imageId;
    if (imageUrl) product.imageUrl = imageUrl;

    await product.save();

    // Build human-readable changelog
    const changes: string[] = [];
    if (oldName && oldName !== product.name)
      changes.push(`Name: "${oldName}" -> "${product.name}"`);
    if (
      oldPrice !== undefined &&
      oldPrice !== null &&
      oldPrice !== product.price
    ) {
      changes.push(
        `Price: ₹${Number(oldPrice).toFixed(2)} -> ₹${Number(product.price).toFixed(2)}`,
      );
    }
    if (product.category && oldCategory !== product.category) {
      changes.push(
        `Category: "${oldCategory || "Standard"}" -> "${product.category}"`,
      );
    }
    if (imageUrl && imageUrl !== oldImageUrl) changes.push("Image: replaced");

    const changeSummary = changes.length > 0 ? ` (${changes.join(", ")})` : "";

    // Terminal command log (suppressed for ghost role)
    if (!(await isGhostSession(session))) {
      await AdminLog.create({
        adminName: session.username,
        command: `${session.username} edited poster "${product.name}"${changeSummary}`,
        actionType: "PRODUCT_UPDATE",
        metadata: {
          productId: product._id,
          oldName,
          newName: product.name,
          oldPrice,
          newPrice: product.price,
          oldCategory,
          newCategory: product.category,
          changes,
        },
      });
    }

    return NextResponse.json({
      message: "Poster updated successfully",
      product,
    });
  } catch (err: any) {
    console.error("[PRODUCTS_PUT]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !hasAdminAccess(session)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 },
      );
    }

    await connectDB();
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Terminal command log (suppressed for ghost role)
    if (!(await isGhostSession(session))) {
      await AdminLog.create({
        adminName: session.username,
        command: `${session.username} deleted product "${product.name}"`,
        actionType: "PRODUCT_DELETE",
        metadata: { productId: product._id, name: product.name },
      });
    }

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (err: unknown) {
    console.error("[PRODUCTS_DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}

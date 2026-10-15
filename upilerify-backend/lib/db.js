const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

// In-memory fallback if MongoDB Atlas is not configured
const inMemoryOrders = new Map();
const inMemoryAlerts = new Set();

let isConnected = false;

async function connectDB() {
  if (isConnected || !MONGODB_URI) return;
  try {
    await mongoose.connect(MONGODB_URI, { bufferCommands: false });
    isConnected = true;
    console.log("[UPIlerify DB] Connected to MongoDB Atlas");
  } catch (err) {
    console.warn("[UPIlerify DB] MongoDB connection failed, using in-memory store:", err.message);
  }
}

// Order Schema
const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    expectedAmount: { type: Number, required: true, index: true },
    merchantUpiId: { type: String, required: true },
    merchantName: { type: String, required: true },
    webhookUrl: { type: String, required: true },
    metadata: { type: Object, default: {} },
    status: { type: String, enum: ["PENDING", "VERIFIED", "FAILED"], default: "PENDING", index: true },
    matchedUtr: { type: String, default: null, index: true },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Processed Alert Schema to avoid duplicate processing
const AlertSchema = new mongoose.Schema(
  {
    messageId: { type: String, unique: true, sparse: true },
    utr: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    rawSubject: { type: String },
    matchedOrderId: { type: String },
  },
  { timestamps: true }
);

// Main Crankshaft Order Schema (points to "orders" collection)
const MainAppOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, index: true },
    upilerifyOrderId: { type: String, index: true },
    amount: { type: Number },
    expectedAmount: { type: Number },
    status: { type: String },
    utr: { type: String },
    paidAt: { type: Date },
    metadata: { type: Object },
  },
  { timestamps: true, strict: false }
);

const OrderModel = mongoose.models.UpiOrder || mongoose.model("UpiOrder", OrderSchema);
const AlertModel = mongoose.models.ProcessedAlert || mongoose.model("ProcessedAlert", AlertSchema);
const MainOrderModel = mongoose.models.Order || mongoose.model("Order", MainAppOrderSchema, "orders");

// Storage Interface
const db = {
  async saveOrder(orderData) {
    if (isConnected) {
      try {
        return await OrderModel.create(orderData);
      } catch (err) {
        console.warn("[UPIlerify DB saveOrder warn]:", err.message);
      }
    }
    inMemoryOrders.set(orderData.orderId, { ...orderData, createdAt: new Date() });
    return orderData;
  },

  async findOrder(orderId) {
    if (isConnected) {
      const upiOrd = await OrderModel.findOne({ orderId });
      if (upiOrd) return upiOrd;
      const mainOrd = await MainOrderModel.findOne({
        $or: [{ orderId }, { upilerifyOrderId: orderId }],
      });
      if (mainOrd) {
        return {
          orderId: mainOrd.upilerifyOrderId || mainOrd.orderId,
          amount: mainOrd.amount,
          expectedAmount: mainOrd.expectedAmount,
          status: mainOrd.status === "PAID" ? "VERIFIED" : mainOrd.status,
          matchedUtr: mainOrd.utr || null,
          verifiedAt: mainOrd.paidAt || null,
          metadata: mainOrd.metadata || {},
          webhookUrl: process.env.WEBHOOK_URL,
        };
      }
    }
    return inMemoryOrders.get(orderId) || null;
  },

  async findPendingOrders() {
    if (!isConnected && MONGODB_URI) {
      await connectDB();
    }
    const list = [];
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    if (isConnected) {
      const upiOrders = await OrderModel.find({ status: "PENDING", createdAt: { $gte: twoHoursAgo } });
      list.push(...upiOrders.map(o => o.toObject ? o.toObject() : o));

      // Also search main crankshaft orders collection
      const mainOrders = await MainOrderModel.find({ status: "PENDING", createdAt: { $gte: twoHoursAgo } });
      for (const mo of mainOrders) {
        const idToCheck = mo.upilerifyOrderId || mo.orderId;
        if (!list.some(o => o.orderId === idToCheck || o.orderId === mo.orderId)) {
          list.push({
            orderId: idToCheck,
            internalOrderId: mo.orderId,
            amount: mo.amount,
            expectedAmount: mo.expectedAmount,
            status: mo.status,
            webhookUrl: process.env.WEBHOOK_URL,
            metadata: { ...mo.metadata, orderId: mo.orderId },
          });
        }
      }
      return list;
    }

    // in-memory fallback
    for (const ord of inMemoryOrders.values()) {
      if (ord.status === "PENDING" && new Date(ord.createdAt).getTime() >= twoHoursAgo.getTime()) {
        list.push(ord);
      }
    }
    return list;
  },

  async markOrderVerified(orderId, utr) {
    const verifiedAt = new Date();
    if (isConnected) {
      await OrderModel.findOneAndUpdate(
        { orderId },
        { status: "VERIFIED", matchedUtr: utr, verifiedAt },
        { new: true }
      );
      // Synchronize directly into main crankshaft orders collection
      await MainOrderModel.updateMany(
        { $or: [{ orderId }, { upilerifyOrderId: orderId }] },
        { status: "PAID", utr, paidAt: verifiedAt }
      );
    }
    const ord = inMemoryOrders.get(orderId);
    if (ord) {
      ord.status = "VERIFIED";
      ord.matchedUtr = utr;
      ord.verifiedAt = verifiedAt;
      inMemoryOrders.set(orderId, ord);
    }
    return { orderId, matchedUtr: utr, verifiedAt, status: "VERIFIED" };
  },

  async isUtrProcessed(utr) {
    if (!utr) return false;
    if (isConnected) {
      const existing = await AlertModel.findOne({ utr });
      return !!existing;
    }
    return inMemoryAlerts.has(utr);
  },

  async recordProcessedAlert(alertData) {
    if (isConnected) {
      try {
        await AlertModel.create(alertData);
      } catch (e) {
        // duplicate key is fine
      }
      return;
    }
    if (alertData.utr) inMemoryAlerts.add(alertData.utr);
  },
};

module.exports = { connectDB, db };

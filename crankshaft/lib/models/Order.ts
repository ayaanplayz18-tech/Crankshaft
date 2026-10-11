import mongoose, { type Document, type Model, Schema } from "mongoose";

export interface IOrderItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface IOrder extends Document {
  orderId: string;
  userId?: string;
  items: IOrderItem[];
  amount: number;
  expectedAmount: number;
  upilerifyOrderId?: string;
  checkoutUrl?: string;
  upiIntentUri?: string;
  status: "PENDING" | "PAID" | "FAILED";
  utr?: string;
  paidAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    imageUrl: { type: String },
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userId: {
      type: String,
      trim: true,
    },
    items: {
      type: [OrderItemSchema],
      default: [],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    expectedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    upilerifyOrderId: {
      type: String,
      trim: true,
      index: true,
    },
    checkoutUrl: {
      type: String,
      trim: true,
    },
    upiIntentUri: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
      index: true,
    },
    utr: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

OrderSchema.index({ createdAt: -1 });

// Ensure hot reloading in dev compiles clean model
if (process.env.NODE_ENV !== "production" && mongoose.models?.Order) {
  delete (mongoose.models as any).Order;
}

const Order: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) ??
  mongoose.model<IOrder>("Order", OrderSchema);

export default Order;

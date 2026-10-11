import mongoose, { type Document, type Model, Schema } from "mongoose";

export interface IShare extends Document {
  userId: string;
  username: string;
  phone?: string;
  numberOfShares: number;
  totalPrice: number; // numberOfShares * 20 rupees
  orderId: string;
  utr?: string;
  status: "PENDING" | "PAID" | "FAILED";
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShareSchema = new Schema<IShare>(
  {
    userId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    phone: { type: String },
    numberOfShares: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 20 },
    orderId: { type: String, required: true, unique: true, trim: true },
    utr: { type: String, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
      index: true,
    },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

ShareSchema.index({ createdAt: -1 });
ShareSchema.index({ status: 1, userId: 1 });

// Prevent model overwrite in dev hot reload
if (process.env.NODE_ENV !== "production" && mongoose.models?.Share) {
  delete (mongoose.models as any).Share;
}

const Share: Model<IShare> =
  (mongoose.models.Share as Model<IShare>) ??
  mongoose.model<IShare>("Share", ShareSchema);

export default Share;

import mongoose, { type Document, type Model, Schema } from "mongoose";

/**
 * Interface representing system configuration for CrankShaft profit shares.
 * Stores dynamic market value (pricePerShare) and admin auditing metadata.
 */
export interface ICapitalChangeLog {
  previousCapital: number;
  newCapital: number;
  previousMarketValue: number;
  newMarketValue: number;
  reason: string;
  updatedBy: string;
  timestamp: Date;
}

/**
 * Interface representing system configuration for CrankShaft profit shares & capital.
 * Capital is the authoritative independent financial metric.
 * Market value (pricePerShare) is derived: pricePerShare = totalCapital / totalShares.
 */
export interface IShareSetting extends Document {
  key: string; // Unique configuration identifier, e.g. "shares_config"
  totalCapital: number; // Total Company Capital in INR (e.g. 20,000)
  totalShares: number; // Total shares authorized (1,000)
  pricePerShare: number; // Derived market value per share in INR (Capital / Total Shares)
  dividendPool: number; // Total distributable dividend pool in INR
  reasonForChange?: string; // Mandatory explanation recorded when capital is altered
  changeHistory: ICapitalChangeLog[]; // Historical audit log of capital changes
  updatedBy: string; // Admin username who last modified the capital
  createdAt: Date;
  updatedAt: Date;
}

const CapitalChangeLogSchema = new Schema<ICapitalChangeLog>(
  {
    previousCapital: { type: Number, required: true },
    newCapital: { type: Number, required: true },
    previousMarketValue: { type: Number, required: true },
    newMarketValue: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    updatedBy: { type: String, default: "Admin" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ShareSettingSchema = new Schema<IShareSetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "shares_config",
      trim: true,
      index: true,
    },
    totalCapital: {
      type: Number,
      required: [true, "Total company capital is required"],
      min: [1, "Total company capital must be positive"],
      default: 20000,
    },
    totalShares: {
      type: Number,
      required: true,
      default: 1000,
    },
    pricePerShare: {
      type: Number,
      required: [true, "Market value per share is required"],
      min: [0.01, "Market value per share must be at least 0.01"],
      default: 20,
    },
    dividendPool: {
      type: Number,
      default: 0,
      min: [0, "Dividend pool cannot be negative"],
    },
    reasonForChange: {
      type: String,
      default: "Initial company capitalization",
      trim: true,
    },
    changeHistory: {
      type: [CapitalChangeLogSchema],
      default: [],
    },
    updatedBy: {
      type: String,
      default: "System",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent model overwrite in Next.js development hot-reloading
if (process.env.NODE_ENV !== "production" && mongoose.models?.ShareSetting) {
  delete (mongoose.models as any).ShareSetting;
}

const ShareSetting: Model<IShareSetting> =
  (mongoose.models.ShareSetting as Model<IShareSetting>) ??
  mongoose.model<IShareSetting>("ShareSetting", ShareSettingSchema);

export default ShareSetting;

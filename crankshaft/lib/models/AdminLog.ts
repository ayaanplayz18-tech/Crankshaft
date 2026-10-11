import mongoose, { type Document, type Model, Schema } from "mongoose";

export interface IAdminLog extends Document {
  adminName: string;
  command: string;
  actionType: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AdminLogSchema = new Schema<IAdminLog>(
  {
    adminName: {
      type: String,
      required: true,
      trim: true,
    },
    command: {
      type: String,
      required: true,
      trim: true,
    },
    actionType: {
      type: String,
      required: true,
      default: "SYSTEM",
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

AdminLogSchema.index({ createdAt: -1 });

// Ensure hot reloading in Next.js development environment re-compiles the schema
if (process.env.NODE_ENV !== "production" && mongoose.models?.AdminLog) {
  delete (mongoose.models as any).AdminLog;
}

const AdminLog: Model<IAdminLog> =
  (mongoose.models.AdminLog as Model<IAdminLog>) ??
  mongoose.model<IAdminLog>("AdminLog", AdminLogSchema);

export default AdminLog;

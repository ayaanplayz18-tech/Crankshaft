import mongoose, { type Document, type Model, Schema } from "mongoose";

/* ─── Interface ─────────────────────────────────────────────────────────── */

export interface IUser extends Document {
  username: string;
  password?: string; // bcrypt hash (optional for Google users)
  phone?: string; // stored as "+91XXXXXXXXXX" (optional for Google users)
  email?: string; // Google email
  googleId?: string; // Firebase / Google UID
  avatar?: string; // Profile photo URL
  authProvider: "credentials" | "google";
  role: "user" | "admin" | "ghost";
  createdAt: Date;
  updatedAt: Date;
}

/* ─── Schema ────────────────────────────────────────────────────────────── */

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be at most 30 characters"],
    },
    password: {
      type: String,
      required: false,
      minlength: [6, "Password must be at least 6 characters"],
    },
    phone: {
      type: String,
      required: false,
      match: [
        /^\+91[0-9]{10}$/,
        "Phone must be a valid +91 number with 10 digits",
      ],
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    googleId: {
      type: String,
      required: false,
    },
    avatar: {
      type: String,
      required: false,
    },
    authProvider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },
    role: {
      type: String,
      enum: ["user", "admin", "ghost"],
      default: "user",
    },
  },
  {
    timestamps: true,
  },
);

UserSchema.index({ role: 1 });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true });

/* ─── Model ─────────────────────────────────────────────────────────────── */

if (process.env.NODE_ENV !== "production" && mongoose.models?.User) {
  delete (mongoose.models as any).User;
}

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ??
  mongoose.model<IUser>("User", UserSchema);

export default User;

import mongoose, { type Document, type Model, Schema } from "mongoose";

export interface IDisplaySetting extends Document {
  key: string; // "home_poster"
  posterUrl: string;
  posterName: string;
  updatedBy: string;
  updatedAt: Date;
}

const DisplaySettingSchema = new Schema<IDisplaySetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "home_poster",
    },
    posterUrl: {
      type: String,
      required: true,
      default: "/poster-ex.png",
    },
    posterName: {
      type: String,
      default: "Classic Porsche Racing Poster",
    },
    updatedBy: {
      type: String,
      default: "System",
    },
  },
  {
    timestamps: true,
  },
);

const DisplaySetting: Model<IDisplaySetting> =
  (mongoose.models.DisplaySetting as Model<IDisplaySetting>) ??
  mongoose.model<IDisplaySetting>("DisplaySetting", DisplaySettingSchema);

export default DisplaySetting;

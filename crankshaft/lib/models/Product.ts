import mongoose, { type Document, type Model, Schema } from "mongoose";

export interface IProduct extends Document {
  name: string;
  price: number;
  category: string;
  imageId: string; // GridFS file ID or static path
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      default: "Classic",
    },
    imageId: {
      type: String,
      required: [true, "Image ID is required"],
    },
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
    },
  },
  {
    timestamps: true,
  },
);

ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ category: 1 });

const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ??
  mongoose.model<IProduct>("Product", ProductSchema);

export default Product;

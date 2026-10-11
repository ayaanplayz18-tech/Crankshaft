import { GridFSBucket } from "mongodb";
import mongoose from "mongoose";

const globalWithMongoose = global as typeof globalThis & { mongoose?: any };

let cached = globalWithMongoose.mongoose;

if (!cached) {
  cached = globalWithMongoose.mongoose = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please define the MONGODB_URI environment variable in .env.local or .env",
    );
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function getGridFSBucket(): Promise<GridFSBucket> {
  const m = await connectDB();
  if (!m.connection.db) {
    throw new Error("MongoDB connection has no active db instance");
  }
  return new GridFSBucket(m.connection.db, {
    bucketName: "uploads",
  });
}

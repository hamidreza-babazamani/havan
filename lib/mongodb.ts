import mongoose, { type Mongoose } from "mongoose";

interface MongooseCache {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  // Reuse the connection across requests handled by the same warm Node.js instance.
  var mongooseCache: MongooseCache | undefined;
}

const cached = (globalThis.mongooseCache ??= {
  connection: null,
  promise: null,
});

/** Call from server-side Node.js code, such as a Node.js Route Handler. */
export async function connectToDatabase(): Promise<Mongoose> {
  if (cached.connection) return cached.connection;

  const uri = process.env.MONGODB_URI;
  if (!uri?.trim()) {
    throw new Error("MONGODB_URI is not configured.");
  }

  cached.promise ??= mongoose.connect(uri);

  try {
    cached.connection = await cached.promise;
    return cached.connection;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

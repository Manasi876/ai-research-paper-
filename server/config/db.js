import mongoose from "mongoose";

let mongoConnected = false;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    console.log("[db] MONGODB_URI not configured. Running with local JSON store (data/store.json).");
    mongoConnected = false;
    return { mode: "local" };
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    mongoConnected = true;
    console.log("[db] Connected to MongoDB Atlas.");
    return { mode: "mongodb" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[db] MongoDB connection failed (${message}). Falling back to local JSON store.`);
    mongoConnected = false;
    return { mode: "local" };
  }
}

export function isMongoConnected() {
  return mongoConnected && mongoose.connection.readyState === 1;
}

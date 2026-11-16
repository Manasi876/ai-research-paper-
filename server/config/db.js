import mongoose from "mongoose";

let mongoConnected = false;
let connectPromise = null;

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    mongoConnected = true;
    return { mode: "mongodb" };
  }

  if (connectPromise) {
    return connectPromise;
  }

  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    console.log(
      "[db] MONGODB_URI not configured. Running with local JSON store fallback."
    );
    mongoConnected = false;
    return { mode: "local" };
  }

  connectPromise = (async () => {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        bufferCommands: false,
      });
      mongoConnected = true;
      console.log("[db] Connected to MongoDB Atlas.");
      return { mode: "mongodb" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[db] MongoDB connection failed (${message}). Falling back to local JSON store.`
      );
      mongoConnected = false;
      return { mode: "local" };
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

export function isMongoConnected() {
  return mongoConnected && mongoose.connection.readyState === 1;
}

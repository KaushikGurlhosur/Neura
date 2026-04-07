import mongoose from "mongoose";

// Store our connection in global scope to prevent multiple connections
// This is important in Next.js because the code can run multiple times

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // If we have a cached connection use it
  if (cached.conn) {
    console.log("Using cached MongoDB connection");
    return cached.conn;
  }

  // If no connection is cached, create a new one
  if (!cached.promise) {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error(
        "Please define the MONGODB_URI environment variable in .env.local",
      );
    }

    console.log("Creating new MongoDB connection.");
    cached.promise = mongoose
      .connect(MONGODB_URI)
      .then((mongoose) => {
        console.log("MongoDB connection established.");
        return mongoose;
      })
      .catch((error) => {
        cached.promise = null; // Reset the promise so we can try again.
        console.error("Error connecting to MongoDB: ", error.message);
        throw error;
      });
  }

  // Await the connection promise and cache the connection.
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;

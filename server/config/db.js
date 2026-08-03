import mongoose from "mongoose";

/**
 * Connect to MongoDB using the connection string from .env
 * Falls back to mongodb-memory-server for testing if connection fails
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(
      `⚠️  Could not connect to MongoDB at ${process.env.MONGODB_URI}`
    );
    console.warn(`   Error: ${error.message}`);
    console.log(`   Falling back to in-memory MongoDB for testing...`);

    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const memoryServer = await MongoMemoryServer.create();
      const memoryUri = memoryServer.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`✅ In-Memory MongoDB Connected: ${conn.connection.host}`);
      console.log(
        `   ℹ️  Data will be lost when the server stops. Set MONGODB_URI in .env for production.`
      );
    } catch (memError) {
      console.error(`❌ Failed to start in-memory MongoDB: ${memError.message}`);
      console.error(
        `   Please set a valid MONGODB_URI in server/.env or install MongoDB.`
      );
      process.exit(1);
    }
  }
};

export default connectDB;

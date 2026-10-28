import mongoose from 'mongoose';

const connectDB = async () => {
  const connectionString = process.env.MONGODB_URI;

  if (!connectionString) {
    throw new Error('MONGODB_URI is not set. Add it to the backend environment.');
  }

  await mongoose.connect(connectionString);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

export default connectDB;
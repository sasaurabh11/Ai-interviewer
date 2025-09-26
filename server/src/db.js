import mongoose from 'mongoose';

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI not set. Proceeding without DB connection. Session data will be ephemeral.');
    return;
  }
  try {
    await mongoose.connect(uri, { autoIndex: true });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection failed. Proceeding without DB.', error);
  }
}


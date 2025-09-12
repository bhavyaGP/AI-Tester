import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`Successfully connected to mongoDB 👍`);
  } catch (error) {
    console.log(`ERROR: ${error.message}`);
    // During tests, throw the error so test runner can catch it instead of
    // exiting the process.
    if (process.env.NODE_ENV === 'test') {
      throw error;
    }
  }
};

export default connectDB;

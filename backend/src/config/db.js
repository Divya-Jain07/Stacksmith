const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    // Configure public DNS resolvers to avoid Windows c-ares SRV lookup failures
    try {
      dns.setServers(['1.1.1.1', '8.8.8.8']);
    } catch (dnsError) {
      console.warn('Warning: Failed to set custom DNS servers:', dnsError.message);
    }
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables.');
    }
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

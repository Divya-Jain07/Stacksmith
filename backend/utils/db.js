const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    // Configure public DNS resolvers to avoid Windows c-ares SRV lookup failures
    dns.setServers(['8.8.8.8', '8.8.4.4']);

    const uri = process.env.MONGO_URI;
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const initChatSocket = require('./socket/chat.socket');
const { corsOptions } = require('./config/cors');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI environment variable is required.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required.');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET must be at least 32 characters in production.');
    process.exit(1);
  }

  try {
    await connectDB();

    // Create a single shared HTTP server for both Express and Socket.IO
    const server = http.createServer(app);

    // Attach Socket.IO to it
    const io = new Server(server, {
      cors: corsOptions
    });

    // Initialize the chat socket handler
    initChatSocket(io);

    server.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`  Library System Backend Server Running  `);
      console.log(`  Local URL: http://localhost:${PORT}      `);
      console.log(`  WebSocket: ws://localhost:${PORT}        `);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=========================================`);
    });
  } catch (error) {
    console.error(`Failed to start the server: ${error.message}`);
    process.exit(1);
  }
};

startServer();


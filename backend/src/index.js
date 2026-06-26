require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const initChatSocket = require('./socket/chat.socket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Create a single shared HTTP server for both Express and Socket.IO
    const server = http.createServer(app);

    // Attach Socket.IO to it
    const io = new Server(server, {
      cors: {
        origin: '*', // Tighten this to your frontend URL in production
        methods: ['GET', 'POST']
      }
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


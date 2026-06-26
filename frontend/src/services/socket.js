import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('stacksmith_token');
    if (!token) return null;
    
    // In dev, VITE_API_URL might be empty, so we point to the proxy target manually if needed.
    // We'll point directly to localhost:5000 in dev, or the origin in production.
    const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

import { Server } from 'socket.io';

let io = null;

export const initSocket = (httpServer, allowedOrigins) => {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected  ${socket.id}`);
    socket.on('disconnect', () => console.log(`[socket] client disconnected ${socket.id}`));
  });

  return io;
};

export const emit = (event, data) => {
  if (io) io.emit(event, data);
};

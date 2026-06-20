import { Server } from 'socket.io';

let io = null;

export const initSocket = (httpServer, isOriginAllowed) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    },
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

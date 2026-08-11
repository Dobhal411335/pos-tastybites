import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { logger } from './src/utils/logger.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      logger.error('Error occurred handling request', err, { url: req.url });
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Attach Socket.IO
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Attach io to global so App Router API routes can use `global.io`
  global.io = io;

  io.on('connection', (socket) => {
    logger.info(`Socket Connected: ${socket.id}`);

    // Allow clients to explicitly join a room
    socket.on('join', (room) => {
      socket.join(room);
      logger.info(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('leave', (room) => {
      socket.leave(room);
      logger.info(`Socket ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket Disconnected: ${socket.id}`);
    });
  });

  server.listen(port, () => {
    logger.info(`Ready on http://${hostname}:${port}`);
    logger.info('Socket.IO Server attached');
  });
}).catch((err) => {
  logger.error('Next.js preparation failed', err);
  process.exit(1);
});

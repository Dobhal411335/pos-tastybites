import { createServer } from 'http';
import { parse } from 'url';
import nextEnv from '@next/env';
import next from 'next';
import { Server } from 'socket.io';
import { logger } from './src/utils/logger.js';

nextEnv.loadEnvConfig(process.cwd());

const {
  resolveSocketAuth,
  authorizeSocketRoom,
} = await import('./src/lib/socketAuth.js');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const corsOrigin = process.env.SOCKET_CORS_ORIGIN
  ? process.env.SOCKET_CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : (dev ? true : false);

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
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Attach io to global so App Router API routes can use `global.io`
  global.io = io;

  io.use(async (socket, nextMiddleware) => {
    try {
      const auth = await resolveSocketAuth(socket.handshake);
      if (!auth) {
        return nextMiddleware(new Error('Unauthorized'));
      }
      socket.data.auth = auth;
      return nextMiddleware();
    } catch (err) {
      logger.error('Socket auth failed', err);
      return nextMiddleware(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const auth = socket.data.auth;
    logger.info(`Socket Connected: ${socket.id}`, {
      restaurantId: auth?.restaurantId,
      authSource: auth?.authSource,
    });

    // Auto-join the restaurant room derived from the session — never from client input.
    if (auth?.restaurantId) {
      socket.join(`restaurant:${auth.restaurantId}`);
    }

    socket.on('join', async (room) => {
      try {
        const allowed = await authorizeSocketRoom(socket.data.auth, room);
        if (!allowed) {
          logger.warn(`Socket ${socket.id} denied join: ${room}`);
          socket.emit('socket:error', { message: 'Room join denied', room });
          return;
        }
        socket.join(room);
        logger.info(`Socket ${socket.id} joined room: ${room}`);
      } catch (err) {
        logger.error(`Socket join error for ${socket.id}`, err);
      }
    });

    socket.on('leave', (room) => {
      if (typeof room !== 'string') return;
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

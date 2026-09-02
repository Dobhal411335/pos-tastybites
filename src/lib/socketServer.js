/**
 * Shared Socket.IO server instance for App Router API routes.
 * Prefer this over bare `global.io` — Next bundling can isolate `global` across modules.
 */
let ioInstance = null;

export function setSocketServer(io) {
  ioInstance = io;
  global.io = io;
}

export function getSocketServer() {
  return ioInstance || global.io || null;
}

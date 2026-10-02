import { getSocketServer } from '@/lib/socketServer';

/**
 * Notify Sales tablets that menu data changed. Payload is intentionally minimal —
 * clients call GET /api/sales/menu/sync for the truth.
 */
export function emitMenuStale(restaurantId) {
  if (!restaurantId) return;
  try {
    const io = getSocketServer();
    io?.to(`restaurant:${String(restaurantId)}`).emit('menu:stale', {
      restaurantId: String(restaurantId),
    });
  } catch {
    // Socket may be unavailable during build/tests — never fail the mutation.
  }
}

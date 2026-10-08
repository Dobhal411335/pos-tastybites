import { withAuth } from '@/utils/auth';
import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';
import { buildMenuSyncPayload } from '@/lib/menu/menuSync';

/** Never cache menu sync — prices must always be fresh for POS tablets. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/sales/menu/sync
 * Single restaurant-scoped menu payload for Sales POS (full or incremental).
 * Query: ?since=<ISO> for incremental sync.
 */
export const GET = withAuth(async (request) => {
  try {
    const restaurantId = request.restaurant;
    if (!restaurantId) {
      return sendError(new Error('Unauthorized'), 'Restaurant context required', 401);
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    const payload = await buildMenuSyncPayload(restaurantId, since);

    logger.info(
      `Menu sync for restaurant ${restaurantId}: fullSync=${payload.fullSync} products=${payload.products.length} categories=${payload.categories.length} offers=${payload.offers.length}`
    );

    return sendSuccess(
      payload,
      payload.fullSync ? 'Full menu sync' : 'Incremental menu sync',
      200,
      {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    );
  } catch (error) {
    logger.error('Menu sync failed', error);
    return sendError(error, 'Failed to sync menu', 500);
  }
});

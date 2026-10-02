import MenuDeletion from '@/models/menu/MenuDeletion';
import { logger } from '@/utils/logger';
import { emitMenuStale } from '@/lib/menu/menuStale';

/**
 * Record a hard-delete tombstone so mobile incremental sync can drop the row.
 */
export async function recordMenuDeletion({
  restaurantId,
  entityType,
  entityId,
  emitStale = true,
}) {
  if (!restaurantId || !entityType || !entityId) return;

  try {
    await MenuDeletion.create({
      restaurant: restaurantId,
      entityType,
      entityId: String(entityId),
      deletedAt: new Date(),
    });
  } catch (error) {
    logger.error('Failed to record menu deletion tombstone', error);
  }

  if (emitStale) {
    emitMenuStale(restaurantId);
  }
}

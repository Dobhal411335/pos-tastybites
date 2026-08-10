import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';
import { withSalesOrDeviceAuth } from '@/utils/salesAuth';
import { markNotificationRead } from '@/lib/notifications/notificationService';

const ROLES = ['ADMIN', 'MANAGER', 'SERVER', 'BARTENDER', 'EMPLOYEE'];

/**
 * PATCH /api/sales/notifications/[id]
 */
export const PATCH = withSalesOrDeviceAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const updated = await markNotificationRead({
      restaurantId: request.restaurant,
      userId: request.user.id,
      notificationId: id,
    });

    if (!updated) {
      return sendError(new Error('Not Found'), 'Notification not found', 404);
    }

    return sendSuccess(updated, 'Notification marked as read');
  } catch (error) {
    logger.error('Failed to mark notification read', error);
    return sendError(error, 'Failed to mark as read', 500);
  }
}, ROLES);

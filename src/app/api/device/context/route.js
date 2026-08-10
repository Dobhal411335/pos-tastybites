import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';
import { getDeviceAuthContext } from '@/utils/deviceAuth';

export async function GET() {
  try {
    const ctx = await getDeviceAuthContext();
    if (!ctx) {
      return sendError(new Error('Unauthorized'), 'Device not activated', 401);
    }

    return sendSuccess(
      {
        restaurantId: ctx.restaurantId,
        deviceId: ctx.userId,
        deviceName: ctx.device.deviceName,
      },
      'Device context retrieved'
    );
  } catch (error) {
    return sendError(error, 'Failed to load device context', 500);
  }
}

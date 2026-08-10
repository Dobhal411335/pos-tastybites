import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import RegisteredDevice from '@/models/RegisteredDevice';
import { verifyToken } from '@/utils/jwt';

export async function getDeviceAuthContext() {
  await connectDB();

  const cookieStore = await cookies();
  const deviceToken = cookieStore.get('device_token')?.value;
  if (!deviceToken) return null;

  const payload = await verifyToken(deviceToken);
  if (!payload || payload.type !== 'device') return null;

  const device = await RegisteredDevice.findById(payload.deviceId);
  if (!device || device.status !== 'Active' || device.activationStatus !== 'Activated') {
    return null;
  }

  if (device.deviceTokenVersion !== payload.version) {
    return null;
  }

  return {
    device,
    restaurantId: device.restaurant.toString(),
    userId: device._id.toString(),
    role: 'DEVICE',
  };
}

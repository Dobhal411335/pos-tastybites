import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RegisteredDevice from '@/models/RegisteredDevice';
import { withAuth } from '@/utils/auth';
import { generateActivationCode } from '@/utils/crypto';

export const POST = withAuth(async (request, context) => {
  try {
    await connectDB();
    const { id } = context.params;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Device ID is required' }, { status: 400 });
    }

    const device = await RegisteredDevice.findOne({ _id: id, restaurant: request.restaurant });

    if (!device) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 });
    }

    // Reset logic
    device.deviceTokenVersion += 1;
    device.activationCode = generateActivationCode();
    device.activationStatus = 'Reset Required';
    device.lastLoginAt = undefined;
    device.lastSeenAt = undefined;
    device.activatedAt = undefined;
    device.activatedBy = undefined;
    device.lastPlatform = undefined;
    device.lastBrowser = undefined;
    device.lastIPAddress = undefined;

    await device.save();

    return NextResponse.json({
      success: true,
      message: 'Device reset successfully. A new activation code has been generated.',
      data: device
    });
  } catch (error) {
    console.error('Device Reset Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}, ['ADMIN', 'MANAGER']);

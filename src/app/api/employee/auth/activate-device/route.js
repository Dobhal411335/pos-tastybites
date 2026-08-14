import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Employee from '@/models/employee/Employee';
import RegisteredDevice from '@/models/RegisteredDevice';
import { comparePassword } from '@/utils/password';
import { signToken } from '@/utils/jwt';
import { setDeviceTokenCookie } from '@/lib/employeeAuthCookies';
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from '@/lib/rateLimit';

function asNonEmptyString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request) {
  try {
    await connectDB();

    const ip = clientIpFromRequest(request);
    const limited = checkRateLimit({
      key: `activate-device:${ip}`,
      limit: 15,
      windowMs: 15 * 60_000,
    });
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec, 'Too many activation attempts. Please try again later.');
    }

    const body = await request.json();
    const employeeId = asNonEmptyString(body?.employeeId);
    const password = asNonEmptyString(body?.password);
    const activationCode = asNonEmptyString(body?.activationCode);

    // Reject objects / operators (NoSQL injection) — only plain strings allowed.
    if (!employeeId || !password || !activationCode) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    if (activationCode.length > 64) {
      return NextResponse.json({ success: false, message: 'Invalid activation code' }, { status: 400 });
    }

    const employee = await Employee.findOne({ 
      $or: [
        { employeeId },
        { username: employeeId.toLowerCase() }
      ]
    });
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, employee.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    if (employee.status !== 'Active' && employee.status !== 'Approved') {
      return NextResponse.json({ success: false, message: 'Employee account is not active' }, { status: 403 });
    }

    const device = await RegisteredDevice.findOne({
      activationCode: String(activationCode),
      restaurant: employee.restaurant,
      activationStatus: { $in: ['Pending', 'Reset Required'] },
    });

    if (!device) {
      return NextResponse.json({ success: false, message: 'Invalid activation code' }, { status: 400 });
    }

    if (device.status !== 'Active') {
      return NextResponse.json({ success: false, message: 'This device is inactive' }, { status: 403 });
    }

    if (device.activationStatus === 'Activated') {
      return NextResponse.json({ success: false, message: 'This activation code has already been used' }, { status: 400 });
    }

    // If a device was pre-assigned, only that employee may activate it.
    if (
      device.assignedEmployee &&
      String(device.assignedEmployee) !== String(employee._id)
    ) {
      return NextResponse.json({
        success: false,
        message: 'This device is assigned to a different employee',
      }, { status: 403 });
    }

    device.assignedEmployee = employee._id;
    device.activationStatus = 'Activated';
    device.activatedAt = new Date();
    device.activatedBy = employee._id;
    device.activationCode = undefined;
    
    await device.save();

    employee.deviceActivationRequired = false;
    await employee.save();

    const deviceToken = await signToken({
      deviceId: device._id.toString(),
      version: device.deviceTokenVersion,
      type: 'device'
    }, '365d'); // Long-lived token for the device

    const response = NextResponse.json({
      success: true,
      message: 'Device activated successfully'
    });

    setDeviceTokenCookie(response, deviceToken);

    return response;
  } catch (error) {
    console.error('Activation Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

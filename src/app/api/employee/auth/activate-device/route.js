import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Employee from '@/models/employee/Employee';
import RegisteredDevice from '@/models/RegisteredDevice';
import { comparePassword } from '@/utils/password';
import { signToken } from '@/utils/jwt';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { employeeId, password, activationCode } = body;

    if (!employeeId || !password || !activationCode) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const employee = await Employee.findOne({ 
      $or: [
        { employeeId: employeeId },
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

    const device = await RegisteredDevice.findOne({ activationCode, restaurant: employee.restaurant });

    if (!device) {
      return NextResponse.json({ success: false, message: 'Invalid activation code' }, { status: 400 });
    }

    if (device.status !== 'Active') {
      return NextResponse.json({ success: false, message: 'This device is inactive' }, { status: 403 });
    }

    if (device.activationStatus === 'Activated') {
      return NextResponse.json({ success: false, message: 'This activation code has already been used' }, { status: 400 });
    }

    // Assign the device to this employee if not assigned or reassigned
    device.assignedEmployee = employee._id;
    device.activationStatus = 'Activated';
    device.activatedAt = new Date();
    device.activatedBy = employee._id;
    // Clear activation code so it can't be used again
    device.activationCode = undefined;
    
    await device.save();

    // Also update the employee's assigned device
    employee.assignedDevice = device._id;
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

    response.cookies.set('device_token', deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 // 1 year
    });

    return response;
  } catch (error) {
    console.error('Activation Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Employee from '@/models/Employee';
import RegisteredDevice from '@/models/RegisteredDevice';
import EmployeeShift from '@/models/EmployeeShift';
import EmployeeSession from '@/models/EmployeeSession';
import { comparePassword } from '@/utils/password';
import { signToken } from '@/utils/jwt';

export async function POST(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { employeeId, password, browserFingerprint, ipAddress } = body;

    if (!employeeId || !password || !browserFingerprint) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify Employee
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Verify Password
    const isMatch = await comparePassword(password, employee.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    // 3. Verify Active Status
    if (!employee.isActive || employee.status !== 'Active') {
      return NextResponse.json({ success: false, message: 'Employee account is not active' }, { status: 403 });
    }

    // 4. Verify Registered Device
    const device = await RegisteredDevice.findOne({ browserFingerprint, status: 'Active' });
    if (!device) {
      return NextResponse.json({ success: false, message: 'Unrecognized or inactive device' }, { status: 403 });
    }
    
    // Update device last login
    device.lastLogin = new Date();
    await device.save();

    // 5. Verify Current Shift
    const activeShift = await EmployeeShift.findOne({ employee: employee._id, status: 'Active' });
    if (!activeShift) {
      return NextResponse.json({ success: false, message: 'No active shift found. Please clock in first.' }, { status: 403 });
    }

    const now = new Date();
    // 30 minute grace period before shift starts
    const shiftStart = new Date(activeShift.startTime.getTime() - 30 * 60000);
    const shiftEnd = activeShift.endTime ? new Date(activeShift.endTime.getTime()) : null;

    if (now < shiftStart) {
      return NextResponse.json({ success: false, message: 'Your shift has not started yet.' }, { status: 403 });
    }
    
    if (shiftEnd && now > shiftEnd) {
      return NextResponse.json({ success: false, message: 'Your shift has already ended.' }, { status: 403 });
    }

    // 6. Create EmployeeSession
    const session = await EmployeeSession.create({
      employee: employee._id,
      restaurant: employee.restaurant,
      shift: activeShift._id,
      device: device._id,
      browserFingerprint,
      ipAddress: ipAddress || 'unknown', // Ideally passed from headers in edge middleware
      status: 'Active'
    });

    // 7. Return JWT
    const accessToken = await signToken({
      employeeId: employee._id.toString(),
      restaurantId: employee.restaurant.toString(),
      sessionId: session._id.toString(),
      role: employee.role,
      type: 'access'
    }, '1h');

    const refreshToken = await signToken({
      employeeId: employee._id.toString(),
      sessionId: session._id.toString(),
      type: 'refresh'
    }, '7d');

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        employee: {
          id: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: employee.role
        }
      }
    });

    // Set Cookies
    response.cookies.set('employee_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 // 1 hour
    });
    
    response.cookies.set('employee_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Employee from '@/models/employee/Employee';
import RegisteredDevice from '@/models/RegisteredDevice';
import EmployeeShift from '@/models/employee/EmployeeShift';
import EmployeeSession from '@/models/employee/EmployeeSession';
import EmployeeLog from '@/models/employee/EmployeeLog';
import { comparePassword } from '@/utils/password';
import { signToken } from '@/utils/jwt';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { employeeId, password, browserFingerprint, ipAddress } = body;

    if (!employeeId || !password || !browserFingerprint) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify Employee
    const employee = await Employee.findOne({ 
      $or: [
        { employeeId: employeeId },
        { username: employeeId.toLowerCase() }
      ]
    });
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Verify Password
    const isMatch = await comparePassword(password, employee.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    // 3. Verify Active Status
    if (employee.status !== 'Active' && employee.status !== 'Approved') {
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

    // 5. Verify Current Shift (Strict validation)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const todaysShifts = await EmployeeShift.find({ 
      employee: employee._id, 
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!todaysShifts || todaysShifts.length === 0) {
      return NextResponse.json({ success: false, message: 'You have no shift scheduled for today.' }, { status: 403 });
    }

    const now = new Date();
    let currentValidShift = null;
    let shiftTooEarly = false;
    let shiftTooLate = false;

    for (const shift of todaysShifts) {
      // Allow 15 min buffer before start
      const shiftStart = new Date(shift.startTime.getTime() - 15 * 60000);
      const shiftEnd = shift.endTime ? new Date(shift.endTime.getTime()) : null;

      if (['Leave', 'Sick Leave', 'Vacation', 'Holiday'].includes(shift.shiftType)) {
        continue;
      }

      if (now < shiftStart) {
        shiftTooEarly = true;
      } else if (shiftEnd && now > shiftEnd) {
        shiftTooLate = true;
      } else {
        currentValidShift = shift;
        break;
      }
    }

    if (!currentValidShift) {
      if (shiftTooEarly) return NextResponse.json({ success: false, message: 'Your shift has not started yet.' }, { status: 403 });
      if (shiftTooLate) return NextResponse.json({ success: false, message: 'Your shift has already ended.' }, { status: 403 });
      
      // If we got here and there were shifts, it means they were skipped (e.g. Leave, Holiday)
      if (todaysShifts.some(s => ['Leave', 'Sick Leave', 'Vacation', 'Holiday'].includes(s.shiftType))) {
        return NextResponse.json({ success: false, message: 'You cannot login because you are marked as on Leave or Holiday today.' }, { status: 403 });
      }

      return NextResponse.json({ success: false, message: 'You are not scheduled to work at this current time.' }, { status: 403 });
    }

    // 6. Create EmployeeSession
    const session = await EmployeeSession.create({
      employee: employee._id,
      restaurant: employee.restaurant,
      shift: currentValidShift._id,
      device: device._id,
      browserFingerprint,
      ipAddress: ipAddress || 'unknown',
      status: 'Active'
    });

    // 7. Create EmployeeLog
    await EmployeeLog.create({
      employee: employee._id,
      restaurant: employee.restaurant,
      shift: currentValidShift._id,
      date: new Date(),
      loginTime: new Date(),
      device: device._id,
      floor: currentValidShift.assignedFloor || employee.assignedFloor,
      tablesAssigned: currentValidShift.assignedTables || []
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

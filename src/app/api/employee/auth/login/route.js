import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import Employee from '@/models/employee/Employee';
import RegisteredDevice from '@/models/RegisteredDevice';
import EmployeeShift from '@/models/employee/EmployeeShift';
import EmployeeSession from '@/models/employee/EmployeeSession';
import DutyChange from '@/models/employee/DutyChange';
import { comparePassword } from '@/utils/password';
import { signToken } from '@/utils/jwt';
import { upsertAttendanceOnClockIn } from '@/lib/attendance';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { employeeId, password, browserFingerprint, ipAddress, platform } = body;

    if (!employeeId || !password) {
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

    const cookieStore = await cookies();
    const deviceTokenCookie = cookieStore.get('device_token')?.value;

    let device = null;

    if (!deviceTokenCookie) {
      return NextResponse.json({ 
        success: false, 
        action: 'DEVICE_ACTIVATION_REQUIRED', 
        message: 'Device activation required.' 
      }, { status: 403 });
    } else {
      const decodedDeviceToken = await verifyToken(deviceTokenCookie);
      if (!decodedDeviceToken || decodedDeviceToken.type !== 'device') {
        return NextResponse.json({ 
          success: false, 
          action: 'DEVICE_ACTIVATION_REQUIRED', 
          message: 'Invalid or expired device token. Please activate again.' 
        }, { status: 403 });
      }
      
      device = await RegisteredDevice.findById(decodedDeviceToken.deviceId);
      
      if (!device || device.status !== 'Active' || device.activationStatus !== 'Activated') {
        return NextResponse.json({ 
          success: false, 
          action: 'DEVICE_ACTIVATION_REQUIRED', 
          message: 'Device unrecognized or inactive. Please activate again.' 
        }, { status: 403 });
      }

      if (device.deviceTokenVersion !== decodedDeviceToken.version) {
        return NextResponse.json({ 
          success: false, 
          action: 'DEVICE_ACTIVATION_REQUIRED', 
          message: 'Device token revoked. Please activate again.' 
        }, { status: 403 });
      }
      
      // Ensure the device belongs to the employee or is generally assigned
      if (device.assignedEmployee && device.assignedEmployee.toString() !== employee._id.toString()) {
        return NextResponse.json({ 
          success: false, 
          message: 'This device is assigned to another employee.' 
        }, { status: 403 });
      }
    }

    // Update login tracking on Employee
    employee.lastLoginAt = new Date();
    employee.lastLoginIP = ipAddress || 'unknown';
    employee.lastLoginPlatform = platform || 'unknown';
    employee.lastLoginBrowser = browserFingerprint || 'unknown';
    await employee.save();

    device.lastLoginAt = new Date();
    device.lastIPAddress = ipAddress || 'unknown';
    device.lastPlatform = platform || 'unknown';
    device.lastBrowser = browserFingerprint || 'unknown';
    await device.save();

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const todayDutyChange = await DutyChange.findOne({
      employee: employee._id,
      date: { $gte: todayStart, $lte: todayEnd },
      status: 'Approved',
    });

    const blockedDutyTypes = ['MarkLeave', 'MarkHoliday', 'MarkAbsent'];
    if (todayDutyChange && blockedDutyTypes.includes(todayDutyChange.changeType)) {
      const label = todayDutyChange.leaveType || (todayDutyChange.changeType === 'MarkAbsent' ? 'Absent' : 'Leave');
      return NextResponse.json({
        success: false,
        message: `Login is not permitted today. You are marked as: ${label}.`
      }, { status: 403 });
    }

    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const recentShifts = await EmployeeShift.find({ 
      employee: employee._id, 
      startTime: { $gte: windowStart, $lte: windowEnd }
    });

    let currentValidShift = null;
    let shiftTooEarly = false;
    let shiftTooLate = false;
    let hasRelevantShifts = false;
    let isOnLeave = false;

    for (const shift of recentShifts) {
      if (['Leave', 'Sick Leave', 'Vacation', 'Holiday'].includes(shift.shiftType)) {
        const sStart = new Date(shift.startTime.getTime());
        const sEnd = shift.endTime ? new Date(shift.endTime.getTime()) : new Date(sStart.getTime() + 24 * 60 * 60 * 1000);
        if (now >= sStart && now <= sEnd) {
          isOnLeave = true;
        }
        continue;
      }

      const shiftStart = new Date(shift.startTime.getTime() - 15 * 60000);
      const shiftEnd = shift.endTime ? new Date(shift.endTime.getTime()) : null;

      if (now < shiftStart) {
        if (shiftStart.getTime() - now.getTime() < 12 * 60 * 60 * 1000) {
          shiftTooEarly = true;
          hasRelevantShifts = true;
        }
      } else if (shiftEnd && now > shiftEnd) {
        if (now.getTime() - shiftEnd.getTime() < 12 * 60 * 60 * 1000) {
          shiftTooLate = true;
          hasRelevantShifts = true;
        }
      } else {
        currentValidShift = shift;
        hasRelevantShifts = true;
        break;
      }
    }

    if (!currentValidShift && todayDutyChange && ['AssignDuty', 'ChangeShift'].includes(todayDutyChange.changeType)) {
      const tempStart = todayDutyChange.newStartTime ? new Date(todayDutyChange.newStartTime.getTime() - 15 * 60000) : null;
      const tempEnd = todayDutyChange.newEndTime ? new Date(todayDutyChange.newEndTime) : null;

      if (tempStart && now < tempStart) {
        shiftTooEarly = true;
        hasRelevantShifts = true;
      } else if (tempEnd && now > tempEnd) {
        shiftTooLate = true;
        hasRelevantShifts = true;
      } else {
        hasRelevantShifts = true;
        currentValidShift = {
          _id: null,
          startTime: todayDutyChange.newStartTime || null,
          endTime: todayDutyChange.newEndTime || null,
          assignedFloor: todayDutyChange.assignedFloor || employee.assignedFloor,
          assignedTables: todayDutyChange.assignedTables?.length
            ? todayDutyChange.assignedTables
            : (employee.assignedTables || []),
          _fromDutyChange: true,
        };
      }
    }

    if (!currentValidShift) {
      if (isOnLeave) {
        return NextResponse.json({ success: false, message: 'You cannot login because you are marked as on Leave or Holiday today.' }, { status: 403 });
      }
      if (!hasRelevantShifts) {
        return NextResponse.json({ success: false, message: 'You have no shift scheduled for today.' }, { status: 403 });
      }
      if (shiftTooLate && !shiftTooEarly) return NextResponse.json({ success: false, message: 'Your shift for today has already ended.' }, { status: 403 });
      if (shiftTooEarly) return NextResponse.json({ success: false, message: 'Your next shift has not started yet.' }, { status: 403 });
      if (shiftTooLate) return NextResponse.json({ success: false, message: 'Your shift has already ended.' }, { status: 403 });
      return NextResponse.json({ success: false, message: 'You are not scheduled to work at this current time.' }, { status: 403 });
    }

    const session = await EmployeeSession.create({
      employee: employee._id,
      restaurant: employee.restaurant,
      shift: currentValidShift._id,
      device: device._id,
      browserFingerprint: browserFingerprint || 'unknown',
      platform: platform || 'unknown',
      ipAddress: ipAddress || 'unknown',
      status: 'Active'
    });

    await upsertAttendanceOnClockIn({
      employee,
      shiftId: currentValidShift._id,
      device,
      loginTime: now,
    });

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

    response.cookies.set('employee_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600
    });

    response.cookies.set('employee_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800
    });

    return response;
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

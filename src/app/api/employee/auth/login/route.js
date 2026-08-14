import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import Employee from '@/models/employee/Employee';
import RegisteredDevice from '@/models/RegisteredDevice';
import EmployeeShift from '@/models/employee/EmployeeShift';
import EmployeeSession from '@/models/employee/EmployeeSession';
import DutyChange from '@/models/employee/DutyChange';
import { comparePassword } from '@/utils/password';
import { signToken, verifyToken } from '@/utils/jwt';
import { upsertAttendanceOnClockIn } from '@/lib/attendance';
import { createNotification } from '@/lib/notifications/notificationService';
import {
  setEmployeeAccessCookie,
  setEmployeeRefreshCookie,
} from '@/lib/employeeAuthCookies';
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from '@/lib/rateLimit';

export async function POST(request) {
  try {
    await connectDB();

    const ip = clientIpFromRequest(request);
    const limited = checkRateLimit({
      key: `employee-login:${ip}`,
      limit: 20,
      windowMs: 15 * 60_000,
    });
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec, 'Too many login attempts. Please try again later.');
    }

    const body = await request.json();
    const employeeIdRaw = body?.employeeId;
    const password = typeof body?.password === 'string' ? body.password : null;
    const { browserFingerprint, ipAddress, platform } = body;

    const employeeId =
      typeof employeeIdRaw === 'string'
        ? employeeIdRaw.trim()
        : typeof employeeIdRaw === 'number'
          ? String(employeeIdRaw)
          : null;

    if (!employeeId || !password) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const perAccount = checkRateLimit({
      key: `employee-login-id:${employeeId.toLowerCase()}:${ip}`,
      limit: 10,
      windowMs: 15 * 60_000,
    });
    if (!perAccount.ok) {
      return rateLimitResponse(perAccount.retryAfterSec, 'Too many login attempts. Please try again later.');
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

      if (String(device.restaurant) !== String(employee.restaurant)) {
        return NextResponse.json({
          success: false,
          action: 'DEVICE_ACTIVATION_REQUIRED',
          message: 'This device is registered to a different restaurant. Please activate a device for your restaurant.',
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
    }).sort({ startTime: 1 });

    let currentValidShift = null;
    let shiftTooEarly = false;
    let shiftTooLate = false;
    let hasRelevantShifts = false;
    let isOnLeave = false;
    let nextShiftStart = null;
    let lastShiftEnd = null;

    for (const shift of recentShifts) {
      if (['Leave', 'Sick Leave', 'Vacation', 'Holiday'].includes(shift.shiftType)) {
        const sStart = new Date(shift.startTime.getTime());
        const sEnd = shift.endTime ? new Date(shift.endTime.getTime()) : new Date(sStart.getTime() + 24 * 60 * 60 * 1000);
        if (now >= sStart && now <= sEnd) {
          isOnLeave = true;
        }
        continue;
      }

      // Clock-in allowed from 15 minutes before start until shift end
      const shiftStart = new Date(shift.startTime.getTime() - 15 * 60000);
      const shiftEnd = shift.endTime ? new Date(shift.endTime.getTime()) : null;

      if (now < shiftStart) {
        if (shiftStart.getTime() - now.getTime() < 12 * 60 * 60 * 1000) {
          shiftTooEarly = true;
          hasRelevantShifts = true;
          if (!nextShiftStart || shift.startTime < nextShiftStart) {
            nextShiftStart = shift.startTime;
          }
        }
      } else if (shiftEnd && now > shiftEnd) {
        if (now.getTime() - shiftEnd.getTime() < 12 * 60 * 60 * 1000) {
          shiftTooLate = true;
          hasRelevantShifts = true;
          if (!lastShiftEnd || shift.endTime > lastShiftEnd) {
            lastShiftEnd = shift.endTime;
          }
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
        if (!nextShiftStart || todayDutyChange.newStartTime < nextShiftStart) {
          nextShiftStart = todayDutyChange.newStartTime;
        }
      } else if (tempEnd && now > tempEnd) {
        shiftTooLate = true;
        hasRelevantShifts = true;
        lastShiftEnd = todayDutyChange.newEndTime;
      } else {
        hasRelevantShifts = true;
        currentValidShift = {
          _id: null,
          startTime: todayDutyChange.newStartTime || null,
          endTime: todayDutyChange.newEndTime || null,
          assignedFloor: todayDutyChange.assignedFloor || null,
          assignedTables: todayDutyChange.assignedTables || [],
          _fromDutyChange: true,
        };
      }
    }

    if (!currentValidShift) {
      const { formatTimeInRestaurantTz } = await import('@/lib/restaurantTime');
      if (isOnLeave) {
        return NextResponse.json({ success: false, message: 'You cannot login because you are marked as on Leave or Holiday today.' }, { status: 403 });
      }
      if (!hasRelevantShifts) {
        return NextResponse.json({
          success: false,
          message: 'You have no shift scheduled for today. Ask admin to apply a shift template to your calendar.',
        }, { status: 403 });
      }
      if (shiftTooLate && !shiftTooEarly) {
        const ended = lastShiftEnd ? formatTimeInRestaurantTz(lastShiftEnd) : '';
        return NextResponse.json({
          success: false,
          message: ended
            ? `Your shift for today already ended at ${ended}.`
            : 'Your shift for today has already ended.',
        }, { status: 403 });
      }
      if (shiftTooEarly) {
        const starts = nextShiftStart ? formatTimeInRestaurantTz(nextShiftStart) : '';
        const clockInFrom = nextShiftStart
          ? formatTimeInRestaurantTz(new Date(new Date(nextShiftStart).getTime() - 15 * 60000))
          : '';
        return NextResponse.json({
          success: false,
          message: starts
            ? `Your next shift starts at ${starts}. You can clock in from ${clockInFrom}.`
            : 'Your next shift has not started yet.',
        }, { status: 403 });
      }
      if (shiftTooLate) {
        return NextResponse.json({ success: false, message: 'Your shift has already ended.' }, { status: 403 });
      }
      return NextResponse.json({ success: false, message: 'You are not scheduled to work at this current time.' }, { status: 403 });
    }

    const previousActive = await EmployeeSession.find({
      employee: employee._id,
      status: 'Active',
    });
    const replacedAt = new Date();
    for (const prev of previousActive) {
      const loginMs = prev.loginTime ? new Date(prev.loginTime).getTime() : replacedAt.getTime();
      prev.logoutTime = replacedAt;
      prev.duration = Math.max(0, Math.floor((replacedAt.getTime() - loginMs) / 1000));
      prev.status = 'Expired';
      await prev.save();
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

    const employeeName = `${employee.firstName} ${employee.lastName || ''}`.trim();
    await createNotification({
      restaurantId: employee.restaurant,
      type: 'EMPLOYEE_LOGIN',
      title: 'Employee Clocked In',
      message: `${employeeName} logged in`,
      employeeId: employee._id,
      priority: 'low',
      metadata: {
        sessionId: session._id.toString(),
        employeeName,
        employeeRole: employee.role,
        employeeCode: employee.employeeId || '',
        loginTime: now.toISOString(),
        platform: platform || 'unknown',
      },
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
      type: 'refresh',
      version: session.refreshTokenVersion || 1,
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

    setEmployeeAccessCookie(response, accessToken);
    setEmployeeRefreshCookie(response, refreshToken);

    return response;
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { withEmployeeAuth } from '@/utils/employeeAuth';
import { finalizeAttendanceOnClockOut } from '@/lib/attendance';
import { createNotification } from '@/lib/notifications/notificationService';

const logoutHandler = async (request) => {
  try {
    const session = request.session;
    const employee = request.employee;
    const duration = Math.floor((Date.now() - session.loginTime.getTime()) / 1000);

    session.logoutTime = new Date();
    session.duration = duration;
    session.status = 'Terminated';
    await session.save();

    await finalizeAttendanceOnClockOut({ session, logoutTime: session.logoutTime });

    const employeeName = `${employee.firstName} ${employee.lastName || ''}`.trim();
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const durationLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    await createNotification({
      restaurantId: employee.restaurant,
      type: 'EMPLOYEE_LOGOUT',
      title: 'Employee Clocked Out',
      message: `${employeeName} logged out · ${durationLabel} on shift`,
      employeeId: employee._id,
      priority: 'low',
      metadata: {
        sessionId: session._id.toString(),
        employeeName,
        employeeRole: employee.role,
        employeeCode: employee.employeeId || '',
        logoutTime: session.logoutTime.toISOString(),
        durationSeconds: duration,
        durationLabel,
      },
    });

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    // Must match set() attributes or production browsers won't clear the cookies
    const clearOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    };
    response.cookies.set('employee_access_token', '', clearOpts);
    response.cookies.set('employee_refresh_token', '', clearOpts);
    return response;
  } catch (error) {
    console.error('Logout Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
};

export const POST = withEmployeeAuth(logoutHandler);

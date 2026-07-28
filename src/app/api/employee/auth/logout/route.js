import { NextResponse } from 'next/server';
import { withEmployeeAuth } from '@/utils/employeeAuth';
import { finalizeAttendanceOnClockOut } from '@/lib/attendance';

const logoutHandler = async (request) => {
  try {
    const session = request.session;
    const duration = Math.floor((Date.now() - session.loginTime.getTime()) / 1000);

    session.logoutTime = new Date();
    session.duration = duration;
    session.status = 'Terminated';
    await session.save();

    await finalizeAttendanceOnClockOut({ session, logoutTime: session.logoutTime });

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.delete('employee_access_token');
    response.cookies.delete('employee_refresh_token');
    return response;
  } catch (error) {
    console.error('Logout Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
};

export const POST = withEmployeeAuth(logoutHandler);

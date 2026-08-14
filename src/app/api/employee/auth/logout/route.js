import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import EmployeeSession from '@/models/employee/EmployeeSession';
import Employee from '@/models/employee/Employee';
import { verifyToken } from '@/utils/jwt';
import { finalizeAttendanceOnClockOut } from '@/lib/attendance';
import { createNotification } from '@/lib/notifications/notificationService';
import { clearEmployeeAuthCookies } from '@/lib/employeeAuthCookies';

async function terminateSession(session, employee) {
  if (!session || session.status !== 'Active') return;

  const loginMs = session.loginTime ? new Date(session.loginTime).getTime() : Date.now();
  const duration = Math.max(0, Math.floor((Date.now() - loginMs) / 1000));
  session.logoutTime = new Date();
  session.duration = duration;
  session.status = 'Terminated';
  await session.save();

  await finalizeAttendanceOnClockOut({ session, logoutTime: session.logoutTime });

  if (!employee) return;

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
}

export async function POST() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('employee_access_token')?.value;
    const refreshToken = cookieStore.get('employee_refresh_token')?.value;

    let sessionId = null;
    const accessPayload = accessToken ? await verifyToken(accessToken) : null;
    const refreshPayload = refreshToken ? await verifyToken(refreshToken) : null;

    if (accessPayload?.sessionId) sessionId = accessPayload.sessionId;
    else if (refreshPayload?.sessionId) sessionId = refreshPayload.sessionId;

    if (sessionId) {
      const session = await EmployeeSession.findById(sessionId);
      const employee = session ? await Employee.findById(session.employee) : null;
      await terminateSession(session, employee);
    }
  } catch (error) {
    console.error('Logout Error:', error);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  clearEmployeeAuthCookies(response);
  return response;
}

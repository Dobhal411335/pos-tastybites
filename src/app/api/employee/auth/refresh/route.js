import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import { verifyToken, signToken } from '@/utils/jwt';
import EmployeeSession from '@/models/employee/EmployeeSession';
import Employee from '@/models/employee/Employee';

export async function POST(request) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('employee_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ success: false, message: 'Refresh token missing' }, { status: 401 });
    }

    const payload = await verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json({ success: false, message: 'Invalid or expired refresh token' }, { status: 401 });
    }

    // Check if session is still active
    const session = await EmployeeSession.findById(payload.sessionId);
    if (!session || session.status !== 'Active') {
      return NextResponse.json({ success: false, message: 'Session expired or terminated' }, { status: 401 });
    }

    // Verify employee is still active
    const employee = await Employee.findById(payload.employeeId);
    if (!employee || !employee.isActive || employee.status !== 'Active') {
      return NextResponse.json({ success: false, message: 'Account suspended or inactive' }, { status: 403 });
    }

    // Issue a new Access Token
    const newAccessToken = await signToken({
      employeeId: employee._id.toString(),
      restaurantId: employee.restaurant.toString(),
      sessionId: session._id.toString(),
      role: employee.role,
      type: 'access'
    }, '1h');

    const response = NextResponse.json({ success: true, message: 'Token refreshed successfully' });

    response.cookies.set('employee_access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 // 1 hour
    });

    return response;
  } catch (error) {
    console.error('Refresh Token Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

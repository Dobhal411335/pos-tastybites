import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import { refreshEmployeeAccessToken } from '@/lib/employeeSession';
import {
  clearEmployeeAuthCookies,
  setEmployeeAccessCookie,
} from '@/lib/employeeAuthCookies';

export async function POST() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('employee_refresh_token')?.value;
    const result = await refreshEmployeeAccessToken(refreshToken);

    if (!result.ok) {
      const response = NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
      clearEmployeeAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({ success: true, message: 'Token refreshed successfully' });
    setEmployeeAccessCookie(response, result.accessToken);
    return response;
  } catch (error) {
    console.error('Refresh Token Error:', error);
    const response = NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    clearEmployeeAuthCookies(response);
    return response;
  }
}

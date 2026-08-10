import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import { refreshEmployeeAccessToken } from '@/lib/employeeSession';

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

      if (result.expireSession) {
        const clearOpts = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 0,
        };
        response.cookies.set('employee_access_token', '', clearOpts);
        response.cookies.set('employee_refresh_token', '', clearOpts);
      }

      return response;
    }

    const response = NextResponse.json({ success: true, message: 'Token refreshed successfully' });

    response.cookies.set('employee_access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600,
    });

    return response;
  } catch (error) {
    console.error('Refresh Token Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

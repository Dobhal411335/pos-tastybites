import { NextResponse } from 'next/server';
import { withEmployeeAuth } from '@/utils/employeeAuth';

const logoutHandler = async (request) => {
  try {
    const session = request.session;
    
    // Calculate duration in seconds
    const duration = Math.floor((Date.now() - session.loginTime.getTime()) / 1000);
    
    // Update session
    session.logoutTime = new Date();
    session.duration = duration;
    session.status = 'Terminated';
    // We must use 'updateOne' or manually update the document since we disabled updatedAt on the schema, but mongoose save() might still work if we explicitly set fields.
    // However, schema says timestamps: { createdAt: 'createdAt', updatedAt: false }.
    // So session.save() works fine, it just won't update an updatedAt field.
    await session.save();

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

    // Clear cookies
    response.cookies.delete('employee_access_token');
    response.cookies.delete('employee_refresh_token');

    return response;
  } catch (error) {
    console.error('Logout Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
};

export const POST = withEmployeeAuth(logoutHandler);

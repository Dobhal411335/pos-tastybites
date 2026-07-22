import { NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import EmployeeSession from '@/models/employee/EmployeeSession';
import Employee from '@/models/employee/Employee';

export const withEmployeeAuth = (handler, allowedPermissions = []) => {
  return async (request, context) => {
    try {
      await connectDB();

      const cookieStore = await cookies();
      const token = cookieStore.get('employee_access_token')?.value;

      if (!token) {
        return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
      }

      const payload = await verifyToken(token);
      if (!payload || payload.type !== 'access') {
        return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
      }

      // 1. Verify Session is still active in Database (Absolute Logout Check)
      const session = await EmployeeSession.findById(payload.sessionId);
      if (!session || session.status !== 'Active') {
        return NextResponse.json({ success: false, message: 'Session expired or terminated' }, { status: 401 });
      }

      // 2. Fetch Employee details (Optional optimization: store more in JWT to avoid DB hit, but this ensures fresh state)
      const employee = await Employee.findById(payload.employeeId).populate('permissionGroup');
      if (!employee || !employee.isActive || employee.status !== 'Active') {
        return NextResponse.json({ success: false, message: 'Account suspended or inactive' }, { status: 403 });
      }

      // 3. Check specific permissions if required
      if (allowedPermissions.length > 0) {
        const hasPermission = employee.permissionGroup?.permissions?.some(p => allowedPermissions.includes(p));
        if (!hasPermission) {
          return NextResponse.json({ success: false, message: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }
      }

      // Attach context to request
      request.employee = employee;
      request.session = session;

      return handler(request, context);
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
  };
};

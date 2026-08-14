import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import { verifyToken } from '@/utils/jwt';
import { sendError } from '@/utils/errorHandler';
import { runWithTenant } from '@/tenant/tenantContext';
import { getDeviceAuthContext } from '@/utils/deviceAuth';
import EmployeeSession from '@/models/employee/EmployeeSession';

function expandAllowedRoles(allowedRoles = []) {
  let expandedRoles = allowedRoles.map((r) => r.toUpperCase());
  if (expandedRoles.includes('ADMIN')) {
    expandedRoles.push('SUPER ADMIN');
  }
  if (expandedRoles.includes('SERVER') || expandedRoles.includes('EMPLOYEE')) {
    expandedRoles.push('STAFF', 'WAIT STAFF', 'BARTENDER', 'SERVER', 'EMPLOYEE');
  }
  return expandedRoles;
}

function roleAllowed(role, allowedRoles = []) {
  if (!allowedRoles.length) return true;
  const expanded = expandAllowedRoles(allowedRoles);
  return expanded.includes((role || '').toUpperCase());
}

/**
 * Allows employee/admin JWT auth, or activated POS device_token (login screen).
 * Device auth is only accepted when allowedRoles is empty or explicitly includes DEVICE.
 */
export function withSalesOrDeviceAuth(handler, allowedRoles = []) {
  return async (request, context) => {
    try {
      await connectDB();

      const cookieStore = await cookies();
      let token = cookieStore.get('token')?.value;
      if (!token) {
        token = cookieStore.get('employee_access_token')?.value;
      }

      if (token) {
        const payload = await verifyToken(token);
        if (payload) {
          if (payload.sessionId) {
            const session = await EmployeeSession.findById(payload.sessionId)
              .select('status')
              .lean();
            if (!session || session.status !== 'Active') {
              return sendError(new Error('Unauthorized'), 'Session expired or terminated', 401);
            }
          }

          if (!roleAllowed(payload.role, allowedRoles)) {
            return sendError(new Error('Forbidden'), 'You do not have permission to access this resource', 403);
          }

          request.user = { id: payload.userId || payload.employeeId, role: payload.role };
          request.restaurant = payload.restaurantId;
          request.role = payload.role;
          request.tokenType = payload.type;
          request.employeeId = payload.employeeId;
          request.authSource = 'user';

          return runWithTenant(payload.restaurantId, () => handler(request, context));
        }
      }

      const deviceCtx = await getDeviceAuthContext();
      if (!deviceCtx) {
        return sendError(new Error('Unauthorized'), 'Authentication required', 401);
      }

      // Device tokens must not bypass role gates for privileged Sales APIs.
      if (allowedRoles.length > 0 && !roleAllowed('DEVICE', allowedRoles) && !allowedRoles.map((r) => r.toUpperCase()).includes('DEVICE')) {
        return sendError(new Error('Forbidden'), 'Employee login required for this resource', 403);
      }

      request.user = { id: deviceCtx.userId };
      request.restaurant = deviceCtx.restaurantId;
      request.role = deviceCtx.role;
      request.authSource = 'device';
      request.device = deviceCtx.device;

      return runWithTenant(deviceCtx.restaurantId, () => handler(request, context));
    } catch (error) {
      return sendError(error, 'Internal Server Error', 500);
    }
  };
}

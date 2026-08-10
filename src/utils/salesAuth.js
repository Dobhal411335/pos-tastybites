import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import { verifyToken } from '@/utils/jwt';
import { sendError } from '@/utils/errorHandler';
import { runWithTenant } from '@/tenant/tenantContext';
import { getDeviceAuthContext } from '@/utils/deviceAuth';

/**
 * Allows employee/admin JWT auth, or activated POS device_token (login screen).
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
          if (allowedRoles.length > 0) {
            let expandedRoles = allowedRoles.map((r) => r.toUpperCase());
            if (expandedRoles.includes('ADMIN')) {
              expandedRoles.push('SUPER ADMIN');
            }
            if (expandedRoles.includes('SERVER') || expandedRoles.includes('EMPLOYEE')) {
              expandedRoles.push('STAFF', 'WAIT STAFF', 'BARTENDER', 'SERVER', 'EMPLOYEE');
            }

            const userRoleUpper = (payload.role || '').toUpperCase();
            if (!expandedRoles.includes(userRoleUpper)) {
              return sendError(new Error('Forbidden'), 'You do not have permission to access this resource', 403);
            }
          }

          request.user = { id: payload.userId || payload.employeeId };
          request.restaurant = payload.restaurantId;
          request.role = payload.role;
          request.authSource = 'user';

          return runWithTenant(payload.restaurantId, () => handler(request, context));
        }
      }

      const deviceCtx = await getDeviceAuthContext();
      if (!deviceCtx) {
        return sendError(new Error('Unauthorized'), 'Authentication required', 401);
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

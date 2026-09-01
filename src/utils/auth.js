import { verifyToken } from './jwt';
import { cookies } from 'next/headers';
import { sendError } from './errorHandler';
import { runWithTenant } from '@/tenant/tenantContext';
import connectDB from '@/lib/db';
import EmployeeSession from '@/models/employee/EmployeeSession';
import RegisteredDevice from '@/models/RegisteredDevice';

/**
 * Higher-order function to wrap API routes with Authentication and Tenant Context.
 * Ensures req.user, req.restaurant, and req.role are available.
 *
 * Employee JWTs (payload.sessionId) must also present a valid activated device_token.
 * Admin cookies (`token` without sessionId) are not device-bound.
 */
export const withAuth = (handler, allowedRoles = []) => {
  return async (request, context) => {
    try {
      await connectDB(); // Ensure DB is connected for every protected route

      const cookieStore = await cookies();
      let token = cookieStore.get('token')?.value;
      let usedEmployeeCookie = false;
      
      // Fallback to employee token if admin token is missing
      if (!token) {
        token = cookieStore.get('employee_access_token')?.value;
        usedEmployeeCookie = Boolean(token);
      }

      if (!token) {
        return sendError(new Error('Unauthorized'), 'Authentication required', 401);
      }

      const payload = await verifyToken(token);
      if (!payload) {
        return sendError(new Error('Unauthorized'), 'Invalid or expired token', 401);
      }

      if (payload.sessionId) {
        const session = await EmployeeSession.findById(payload.sessionId);
        if (!session || session.status !== 'Active') {
          return sendError(new Error('Unauthorized'), 'Session expired or terminated', 401);
        }

        // Employee Sales sessions require a valid POS device binding
        if (usedEmployeeCookie || payload.type === 'access') {
          const deviceToken = cookieStore.get('device_token')?.value;
          if (!deviceToken) {
            return sendError(new Error('Unauthorized'), 'Device token missing', 401);
          }
          const devicePayload = await verifyToken(deviceToken);
          if (!devicePayload || devicePayload.type !== 'device') {
            return sendError(new Error('Unauthorized'), 'Invalid device token', 401);
          }
          const device = await RegisteredDevice.findById(devicePayload.deviceId);
          if (!device || device.status !== 'Active' || device.activationStatus !== 'Activated') {
            return sendError(new Error('Forbidden'), 'Device is inactive', 403);
          }
          if (device.deviceTokenVersion !== devicePayload.version) {
            return sendError(new Error('Unauthorized'), 'Device has been reset', 401);
          }
          if (String(device.restaurant) !== String(payload.restaurantId)) {
            return sendError(new Error('Forbidden'), 'Device restaurant mismatch', 403);
          }
          request.device = device;
        }
      }

      // Role check
      if (allowedRoles.length > 0) {
        let expandedRoles = allowedRoles.map(r => r.toUpperCase());
        // Automatically allow new Admin roles if legacy ADMIN is required
        if (expandedRoles.includes('ADMIN')) {
          expandedRoles.push('SUPER ADMIN', 'MASTER TERMINAL');
        }
        
        if (expandedRoles.includes('MANAGER')) {
          expandedRoles.push('MANAGER TERMINAL');
        }
        
        // Automatically allow all floor staff variations if SERVER or EMPLOYEE is required
        if (expandedRoles.includes('SERVER') || expandedRoles.includes('EMPLOYEE')) {
          expandedRoles.push('STAFF', 'WAIT STAFF', 'BARTENDER', 'SERVER', 'EMPLOYEE');
        }
        
        const userRoleUpper = (payload.role || '').toUpperCase();
        
        if (!expandedRoles.includes(userRoleUpper)) {
          console.log(`[Auth Forbidden] User role: "${payload.role}" (Upper: "${userRoleUpper}") not in allowed roles:`, expandedRoles);
          return sendError(new Error('Forbidden'), 'You do not have permission to access this resource', 403);
        }
      }

      // Attach context to request object (simulated via custom properties on NextRequest)
      request.user = {
        id: payload.userId || payload.employeeId,
        role: payload.role,
      };
      request.restaurant = payload.restaurantId;
      request.role = payload.role;
      request.tokenType = payload.type;
      request.employeeId = payload.employeeId;

      // Run the handler inside the Tenant Context (AsyncLocalStorage)
      return runWithTenant(payload.restaurantId, () => handler(request, context));
    } catch (error) {
      return sendError(error, 'Internal Server Error', 500);
    }
  };
};

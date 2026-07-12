import { verifyToken } from './jwt';
import { cookies } from 'next/headers';
import { sendError } from './errorHandler';
import { runWithTenant } from '@/tenant/tenantContext';
import dbConnect from '@/lib/db';

/**
 * Higher-order function to wrap API routes with Authentication and Tenant Context.
 * Ensures req.user, req.restaurant, and req.role are available.
 */
export const withAuth = (handler, allowedRoles = []) => {
  return async (request, context) => {
    try {
      await dbConnect(); // Ensure DB is connected for every protected route
      
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;

      if (!token) {
        return sendError(new Error('Unauthorized'), 'Authentication required', 401);
      }

      const payload = await verifyToken(token);
      if (!payload) {
        return sendError(new Error('Unauthorized'), 'Invalid or expired token', 401);
      }

      // Role check
      if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        return sendError(new Error('Forbidden'), 'You do not have permission to access this resource', 403);
      }

      // Attach context to request object (simulated via custom properties on NextRequest)
      request.user = { id: payload.userId };
      request.restaurant = payload.restaurantId;
      request.role = payload.role;

      // Run the handler inside the Tenant Context (AsyncLocalStorage)
      return runWithTenant(payload.restaurantId, () => handler(request, context));
    } catch (error) {
      return sendError(error, 'Internal Server Error', 500);
    }
  };
};

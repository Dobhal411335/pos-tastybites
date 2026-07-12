import { verifyToken } from '@/utils/jwt';
import { cookies } from 'next/headers';

export const resolveTenantFromRequest = async (request) => {
  // First, try to resolve from JWT token
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (token) {
    const payload = await verifyToken(token);
    if (payload && payload.restaurantId) {
      return payload.restaurantId;
    }
  }

  // Fallback: check headers if it's an API key or machine-to-machine request
  const restaurantIdHeader = request.headers.get('x-restaurant-id');
  if (restaurantIdHeader) {
    return restaurantIdHeader;
  }

  return null;
};

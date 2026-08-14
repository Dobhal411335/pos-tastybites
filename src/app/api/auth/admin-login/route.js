import { AuthService } from '@/services/AuthService';
import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';
import connectDB from '@/lib/db';
import { setCookie } from '@/utils/cookies';
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from '@/lib/rateLimit';

export async function POST(request) {
  try {
    await connectDB();

    const ip = clientIpFromRequest(request);
    const limited = checkRateLimit({
      key: `admin-login:${ip}`,
      limit: 20,
      windowMs: 15 * 60_000,
    });
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec, 'Too many login attempts. Please try again later.');
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return sendError(new Error('Email and password are required'), 'Validation error', 400);
    }

    const perAccount = checkRateLimit({
      key: `admin-login-email:${String(email).toLowerCase()}:${ip}`,
      limit: 10,
      windowMs: 15 * 60_000,
    });
    if (!perAccount.ok) {
      return rateLimitResponse(perAccount.retryAfterSec, 'Too many login attempts. Please try again later.');
    }

    const authService = new AuthService();
    const { token, user } = await authService.adminLogin(email, password);

    // Hardcode 1 day expiry, match with jwt.js if needed.
    // Assuming next/headers cookies are used in the app, but setCookie is a client/server wrapper.
    // In App Router API routes, we can just return a Set-Cookie header.

    return Response.json(
      { success: true, message: 'Login successful', data: user },
      {
        status: 200,
        headers: {
          'Set-Cookie': `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
        },
      }
    );
  } catch (error) {
    return sendError(error, error.message, 401);
  }
}

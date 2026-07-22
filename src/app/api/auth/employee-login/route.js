import { AuthService } from '@/services/AuthService';
import { sendError } from '@/utils/errorHandler';
import connectDB from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    const { email, password } = await request.json();

    if (!email || !password) {
      return sendError(new Error('Email and password are required'), 'Validation error', 400);
    }

    const authService = new AuthService();
    const { token, user } = await authService.employeeLogin(email, password);

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

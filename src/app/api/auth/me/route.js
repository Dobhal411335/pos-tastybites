import { withAuth } from '@/utils/auth';
import { AuthService } from '@/services/AuthService';
import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';

const meHandler = async (request) => {
  const authService = new AuthService();
  const user = await authService.getCurrentUser(request.user.id, request.role, {
    tokenType: request.tokenType,
    employeeId: request.employeeId,
  });

  if (!user) {
    return sendError(new Error('Unauthorized'), 'User not found', 401);
  }

  return sendSuccess(user, 'User profile retrieved successfully');
};

export const GET = withAuth(meHandler);

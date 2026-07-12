import { withAuth } from '@/utils/auth';
import { AuthService } from '@/services/AuthService';
import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';

const changePasswordHandler = async (request) => {
  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return sendError(new Error('Current and new passwords are required'), 'Validation error', 400);
  }

  const authService = new AuthService();
  await authService.changePassword(request.user.id, request.role, currentPassword, newPassword);

  return sendSuccess(null, 'Password changed successfully');
};

export const POST = withAuth(changePasswordHandler);

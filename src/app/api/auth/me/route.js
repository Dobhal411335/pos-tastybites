import { withAuth } from '@/utils/auth';
import { AuthService } from '@/services/AuthService';
import { sendSuccess } from '@/utils/apiResponse';

const meHandler = async (request) => {
  const authService = new AuthService();
  const user = await authService.getCurrentUser(request.user.id, request.role);
  
  return sendSuccess(user, 'User profile retrieved successfully');
};

export const GET = withAuth(meHandler);

import connectDB from '@/lib/db';
import { withAuth } from '@/utils/auth';
import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';
import Admin from '@/models/Admin';
import { hashPassword } from '@/utils/password';

async function updateAdminHandler(request, context) {
  try {
    await connectDB();
    const { id } = await context.params;
    const updateData = await request.json();

    if (!id) {
      return sendError(new Error('Missing ID'), 'Admin ID is required', 400);
    }
    
    // Determine the user performing the action
    const currentUserId = String(request.user.id);
    const currentUserRole = request.role; // 'Super Admin', 'Admin', or legacy 'ADMIN'
    
    // Authorization Check
    const isSuperAdmin = currentUserRole === 'Super Admin' || currentUserRole === 'ADMIN';
    const isEditingSelf = currentUserId === String(id);
    
    if (!isSuperAdmin && !isEditingSelf) {
      return sendError(new Error('You can only edit your own profile'), 'Forbidden', 403);
    }
    
    const targetAdmin = await Admin.findById(id);
    if (!targetAdmin) {
      return sendError(new Error('Admin not found'), 'Not Found', 404);
    }
    
    // Prevent Super Admin from disabling themselves
    if (updateData.status === 'Inactive' && isEditingSelf) {
      return sendError(new Error('You cannot disable your own account'), 'Validation Error', 400);
    }
    
    // Filter what can be updated
    const allowedUpdates = {};
    if (updateData.name) allowedUpdates.name = updateData.name;
    if (updateData.phone !== undefined) allowedUpdates.phone = updateData.phone;
    
    // Only Super Admins can change roles and status
    if (isSuperAdmin) {
      if (updateData.role) allowedUpdates.role = updateData.role;
      if (updateData.status) allowedUpdates.status = updateData.status;
    }
    
    // Email is read-only
    if (updateData.password !== undefined && updateData.password !== '') {
      if (updateData.password.length < 8) {
        return sendError(new Error('Password must be at least 8 characters'), 'Validation Error', 400);
      }

      if (!isSuperAdmin && !isEditingSelf) {
        return sendError(new Error('You can only change your own password'), 'Forbidden', 403);
      }

      allowedUpdates.password = await hashPassword(updateData.password);
      allowedUpdates.plainPassword = updateData.password;
    }
    
    const updatedAdmin = await Admin.findByIdAndUpdate(id, allowedUpdates, { new: true })
      .select('-password -plainPassword -verificationOtpHash -verificationOtpExpiresAt')
      .lean();
      
    return sendSuccess(updatedAdmin, 'Admin updated successfully');
  } catch (error) {
    return sendError(error, error.message, 500);
  }
}

export const PUT = withAuth(updateAdminHandler);

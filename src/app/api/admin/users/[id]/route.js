import connectDB from '@/lib/db';
import { withAuth } from '@/utils/auth';
import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';
import Admin from '@/models/Admin';

async function updateAdminHandler(request, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const updateData = await request.json();
    
    // Determine the user performing the action
    const currentUserId = request.user.id;
    const currentUserRole = request.role; // 'Super Admin', 'Admin', or legacy 'ADMIN'
    
    // Authorization Check
    const isSuperAdmin = currentUserRole === 'Super Admin' || currentUserRole === 'ADMIN';
    const isEditingSelf = currentUserId === id;
    
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
    
    // Passwords and emails are explicitly NOT updated here
    // Passwords require a separate Reset Password endpoint
    // Email is read-only
    
    const updatedAdmin = await Admin.findByIdAndUpdate(id, allowedUpdates, { new: true })
      .select('-password -encryptedPassword')
      .lean();
      
    return sendSuccess(updatedAdmin, 'Admin updated successfully');
  } catch (error) {
    return sendError(error, error.message, 500);
  }
}

export const PUT = withAuth(updateAdminHandler);

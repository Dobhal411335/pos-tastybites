import connectDB from '@/lib/db';
import { withAuth } from '@/utils/auth';
import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';
import Admin from '@/models/Admin';
import { hashPassword } from '@/utils/password';
import crypto from 'crypto';
import { sendAdminVerificationEmail } from '@/lib/brevo/sendAdminVerificationEmail';

/**
 * POST /api/admin/users/send-verification
 * Generates a new OTP, saves hashed version to the unverified admin,
 * and emails the OTP to the requesting super admin.
 */
async function sendVerificationHandler(request) {
  try {
    await connectDB();

    if (request.role !== 'Super Admin' && request.role !== 'ADMIN') {
      return sendError(new Error('Only Super Admins can send verification codes.'), 'Forbidden', 403);
    }

    const { adminId } = await request.json();

    if (!adminId) {
      return sendError(new Error('Admin ID is required'), 'Validation Error', 400);
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return sendError(new Error('Admin not found'), 'Not Found', 404);
    }

    if (admin.isVerified === true) {
      return sendError(new Error('This admin is already verified'), 'Validation Error', 400);
    }

    // Get the super admin who is making the request
    const superAdmin = await Admin.findById(request.user.id);
    if (!superAdmin) {
      return sendError(new Error('Super admin not found'), 'Not Found', 404);
    }

    // Generate a fresh 6-digit OTP
    const verificationCode = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    admin.verificationOtpHash = await hashPassword(verificationCode);
    admin.verificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await admin.save();

    const adminDashboardUrl = process.env.NEXT_PUBLIC_BASE_URL
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/admin/users`
      : undefined;

    await sendAdminVerificationEmail({
      to: superAdmin.email,
      superAdminName: superAdmin.name || 'Super Admin',
      adminName: admin.name,
      adminEmail: admin.email,
      adminRole: admin.role,
      verificationCode,
      adminDashboardUrl,
    });

    return sendSuccess(
      { adminId: admin._id },
      'Verification OTP sent to super admin email. It expires in 10 minutes.'
    );
  } catch (error) {
    return sendError(error, error.message, 500);
  }
}

export const POST = withAuth(sendVerificationHandler);

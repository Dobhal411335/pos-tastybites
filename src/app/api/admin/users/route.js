import connectDB from '@/lib/db';
import { withAuth } from '@/utils/auth';
import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';
import Admin from '@/models/Admin';
import { hashPassword, comparePassword } from '@/utils/password';
import crypto from 'crypto';
import { sendAdminVerificationEmail } from '@/lib/brevo/sendAdminVerificationEmail';

async function getUsersHandler(request) {
  try {
    await connectDB();
    
    // Authorization: Only Admin / Super Admin
    if (request.role !== 'ADMIN' && request.role !== 'Super Admin' && request.role !== 'Admin') {
      return sendError(new Error('Unauthorized access'), 'Unauthorized', 403);
    }
    
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    const query = {};
    if (role && role !== 'All Roles') query.role = role;
    if (status && status !== 'All Status') query.status = status;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    const admins = await Admin.find(query).select('-password -plainPassword -verificationOtpHash -verificationOtpExpiresAt').sort({ createdAt: -1 }).lean();
    return sendSuccess(admins, 'Admins retrieved successfully');
  } catch (error) {
    return sendError(error, error.message, 500);
  }
}

async function createAdminHandler(request) {
  try {
    await connectDB();
    
    // Authorization: Only Super Admin
    if (request.role !== 'Super Admin' && request.role !== 'ADMIN') { // Fallback for legacy ADMIN
      return sendError(new Error('Only Super Admins can create new admin accounts.'), 'Forbidden', 403);
    }
    
    const { name, email, phone, password, role, status } = await request.json();
    
    if (!name || !email || !password) {
      return sendError(new Error('Name, Email, and Password are required'), 'Validation Error', 400);
    }
    
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return sendError(new Error('An admin with this email already exists'), 'Validation Error', 400);
    }
    
    const hashedPassword = await hashPassword(password);
    const verificationCode = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    
    // Get total admin count to determine if this should be a Super Admin fallback.
    const totalAdmins = await Admin.countDocuments();
    let finalRole = role || 'Admin';
    const isBootstrapSuperAdmin = totalAdmins === 0;
    if (isBootstrapSuperAdmin) finalRole = 'Super Admin';
    
    // Get restaurantId from the creator
    const creatorAdmin = await Admin.findById(request.user.id);
    const restaurantId = creatorAdmin ? creatorAdmin.restaurantId : null;
    
    const newAdmin = await Admin.create({
      name,
      email,
      phone,
      password: hashedPassword,
      plainPassword: password,
      role: finalRole,
      status: status || 'Active',
      isVerified: isBootstrapSuperAdmin,
      verifiedAt: isBootstrapSuperAdmin ? new Date() : undefined,
      restaurantId: restaurantId
    });

    if (!isBootstrapSuperAdmin) {
      newAdmin.verificationOtpHash = await hashPassword(verificationCode);
      newAdmin.verificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      newAdmin.isVerified = false;
      await newAdmin.save();

      const adminDashboardUrl = process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/admin/users`
        : undefined;

      try {
        await sendAdminVerificationEmail({
          to: creatorAdmin?.email,
          superAdminName: creatorAdmin?.name || 'Super Admin',
          adminName: newAdmin.name,
          adminEmail: newAdmin.email,
          adminRole: newAdmin.role,
          verificationCode,
          adminDashboardUrl,
        });
      } catch (emailError) {
        await Admin.findByIdAndDelete(newAdmin._id);
        throw emailError;
      }
    } else {
      await newAdmin.save();
    }
    
    const adminObj = newAdmin.toObject();
    delete adminObj.password;
    delete adminObj.plainPassword;
    delete adminObj.verificationOtpHash;
    delete adminObj.verificationOtpExpiresAt;
    
    return sendSuccess(adminObj, isBootstrapSuperAdmin ? 'Super admin created successfully' : 'Admin created successfully. Verification code sent to the super admin email.', 201);
  } catch (error) {
    return sendError(error, error.message, 500);
  }
}

async function verifyAdminHandler(request) {
  try {
    await connectDB();

    if (request.role !== 'Super Admin' && request.role !== 'ADMIN') {
      return sendError(new Error('Only Super Admins can verify admin accounts.'), 'Forbidden', 403);
    }

    const { adminId, otp } = await request.json();

    if (!adminId || !otp) {
      return sendError(new Error('Admin ID and verification code are required'), 'Validation Error', 400);
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return sendError(new Error('Admin not found'), 'Not Found', 404);
    }

    if (admin.isVerified === true) {
      const verifiedAdmin = admin.toObject();
      delete verifiedAdmin.password;
      delete verifiedAdmin.plainPassword;
      delete verifiedAdmin.verificationOtpHash;
      delete verifiedAdmin.verificationOtpExpiresAt;
      return sendSuccess(verifiedAdmin, 'Admin is already verified');
    }

    if (!admin.verificationOtpHash || !admin.verificationOtpExpiresAt) {
      return sendError(new Error('No verification code pending for this admin'), 'Validation Error', 400);
    }

    if (admin.verificationOtpExpiresAt.getTime() < Date.now()) {
      return sendError(new Error('Verification code has expired'), 'Validation Error', 400);
    }

    const isMatch = await comparePassword(String(otp).trim(), admin.verificationOtpHash);
    if (!isMatch) {
      return sendError(new Error('Invalid verification code'), 'Validation Error', 400);
    }

    admin.isVerified = true;
    admin.verifiedAt = new Date();
    admin.verificationOtpHash = undefined;
    admin.verificationOtpExpiresAt = undefined;
    await admin.save();

    const verifiedAdmin = admin.toObject();
    delete verifiedAdmin.password;
    delete verifiedAdmin.plainPassword;
    delete verifiedAdmin.verificationOtpHash;
    delete verifiedAdmin.verificationOtpExpiresAt;

    return sendSuccess(verifiedAdmin, 'Admin verified successfully');
  } catch (error) {
    return sendError(error, error.message, 500);
  }
}

export const GET = withAuth(getUsersHandler);
export const POST = withAuth(createAdminHandler);
export const PATCH = withAuth(verifyAdminHandler);

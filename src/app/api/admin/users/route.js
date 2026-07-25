import connectDB from '@/lib/db';
import { withAuth } from '@/utils/auth';
import { sendSuccess } from '@/utils/apiResponse';
import { sendError } from '@/utils/errorHandler';
import Admin from '@/models/Admin';
import { hashPassword } from '@/utils/password';
import { encryptString } from '@/utils/crypto';

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
    
    const admins = await Admin.find(query).select('-password -encryptedPassword').sort({ createdAt: -1 }).lean();
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
    
    // Hash and encrypt password
    const hashedPassword = await hashPassword(password);
    const encrypted = encryptString(password);
    
    // Get total admin count to determine if this should be a Super Admin fallback.
    const totalAdmins = await Admin.countDocuments();
    let finalRole = role || 'Admin';
    if (totalAdmins === 0) finalRole = 'Super Admin';
    
    // Get restaurantId from the creator
    const creatorAdmin = await Admin.findById(request.user.id);
    const restaurantId = creatorAdmin ? creatorAdmin.restaurantId : null;
    
    const newAdmin = await Admin.create({
      name,
      email,
      phone,
      password: hashedPassword,
      encryptedPassword: encrypted,
      role: finalRole,
      status: status || 'Active',
      restaurantId: restaurantId
    });
    
    const adminObj = newAdmin.toObject();
    delete adminObj.password;
    delete adminObj.encryptedPassword;
    
    return sendSuccess(adminObj, 'Admin created successfully', 201);
  } catch (error) {
    return sendError(error, error.message, 500);
  }
}

export const GET = withAuth(getUsersHandler);
export const POST = withAuth(createAdminHandler);

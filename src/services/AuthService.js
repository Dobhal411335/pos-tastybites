import { AuthRepository } from '@/repositories/AuthRepository';
import { comparePassword, hashPassword } from '@/utils/password';
import { signToken } from '@/utils/jwt';
import { setCookie, deleteCookie } from '@/utils/cookies';

export class AuthService {
  constructor() {
    this.authRepo = new AuthRepository();
  }

  async adminLogin(email, password) {
    const admin = await this.authRepo.findAdminByEmail(email);
    if (!admin) throw new Error('Invalid credentials');

    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) throw new Error('Invalid credentials');

    const token = await signToken({
      userId: admin._id,
      restaurantId: admin.restaurantId,
      role: admin.role,
    });

    return { token, user: { id: admin._id, email: admin.email, role: admin.role } };
  }

  async employeeLogin(email, password) {
    const employee = await this.authRepo.findEmployeeByEmail(email);
    if (!employee || !employee.isActive) throw new Error('Invalid credentials or inactive account');

    const isMatch = await comparePassword(password, employee.password);
    if (!isMatch) throw new Error('Invalid credentials');

    const token = await signToken({
      userId: employee._id,
      restaurantId: employee.restaurantId,
      role: employee.role,
    });

    return { token, user: { id: employee._id, email: employee.email, role: employee.role } };
  }

  async getCurrentUser(userId, role) {
    if (role === 'ADMIN') {
      return await this.authRepo.findAdminById(userId);
    }
    return await this.authRepo.findEmployeeById(userId);
  }

  async changePassword(userId, role, currentPassword, newPassword) {
    let user = role === 'ADMIN' 
      ? await this.authRepo.findAdminById(userId) 
      : await this.authRepo.findEmployeeById(userId);

    // Fetch full document with password for comparison
    if (role === 'ADMIN') {
      user = await this.authRepo.findAdminByEmail(user.email);
    } else {
      user = await this.authRepo.findEmployeeByEmail(user.email);
    }

    if (!user) throw new Error('User not found');

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) throw new Error('Incorrect current password');

    const hashedNew = await hashPassword(newPassword);

    if (role === 'ADMIN') {
      await this.authRepo.updateAdminPassword(userId, hashedNew);
    } else {
      await this.authRepo.updateEmployeePassword(userId, hashedNew);
    }

    return true;
  }
}

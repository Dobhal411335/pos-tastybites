import Admin from '@/models/Admin';
import Employee from '@/models/Employee';

export class AuthRepository {
  async findAdminByEmail(email) {
    return await Admin.findOne({ email }).lean();
  }

  async findEmployeeByEmail(email) {
    return await Employee.findOne({ email }).lean();
  }

  async findAdminById(id) {
    return await Admin.findById(id).select('-password').lean();
  }

  async findEmployeeById(id) {
    return await Employee.findById(id).select('-password').lean();
  }

  async updateAdminPassword(id, hashedPassword) {
    return await Admin.findByIdAndUpdate(id, { password: hashedPassword });
  }

  async updateEmployeePassword(id, hashedPassword) {
    return await Employee.findByIdAndUpdate(id, { password: hashedPassword });
  }
}

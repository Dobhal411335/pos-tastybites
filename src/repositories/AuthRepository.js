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
    try {
      let queryId = id;
      if (id && typeof id === 'object' && !id._bsontype) {
        // Safe conversion of stringified JSON objects
        const str = JSON.stringify(id);
        if (str.includes('buffer')) {
          // If it contains a buffer array, let Mongoose fail gracefully or try to construct standard hex
          return null;
        }
      }
      return await Admin.findById(queryId).select('-password').lean();
    } catch (err) {
      return null;
    }
  }

  async findEmployeeById(id) {
    try {
      let queryId = id;
      if (id && typeof id === 'object' && !id._bsontype) {
        const str = JSON.stringify(id);
        if (str.includes('buffer')) {
          return null;
        }
      }
      return await Employee.findById(queryId).select('-password').lean();
    } catch (err) {
      return null;
    }
  }

  async updateAdminPassword(id, hashedPassword) {
    return await Admin.findByIdAndUpdate(id, { password: hashedPassword });
  }

  async updateEmployeePassword(id, hashedPassword) {
    return await Employee.findByIdAndUpdate(id, { password: hashedPassword });
  }
}

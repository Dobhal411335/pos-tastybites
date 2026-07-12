import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password
    role: { type: String, required: true, enum: ['MANAGER', 'WAITER', 'CASHIER', 'KITCHEN'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password
    phone: { type: String },
    role: { type: String, required: true, enum: ['MANAGER', 'WAITER', 'CASHIER', 'KITCHEN'], default: 'WAITER' },
    status: { type: String, required: true, enum: ['APPROVED', 'UNAPPROVED', 'SUSPENDED'], default: 'UNAPPROVED' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Virtual for backward compatibility
EmployeeSchema.virtual('name').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

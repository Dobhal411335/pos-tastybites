import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, enum: ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER', 'KITCHEN'] },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Role || mongoose.model('Role', RoleSchema);

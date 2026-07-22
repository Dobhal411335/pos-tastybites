import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Role || mongoose.model('Role', RoleSchema);

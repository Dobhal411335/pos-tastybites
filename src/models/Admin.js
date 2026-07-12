import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password
    role: { type: String, default: 'ADMIN' },
    // System admin controls everything across all restaurants, or they can be tied to one.
    // If Admin is just a master user for a single restaurant:
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

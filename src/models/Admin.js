import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Bcrypt hash for login
    plainPassword: { type: String }, // Plain text for admin viewing only (never exposed in list APIs)
    phone: { type: String },
    role: { type: String, enum: ['Super Admin', 'Admin'], default: 'Super Admin' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    isVerified: { type: Boolean, default: false },
    verificationOtpHash: { type: String },
    verificationOtpExpiresAt: { type: Date },
    verifiedAt: { type: Date },
    lastLogin: { type: Date },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

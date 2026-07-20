import mongoose from 'mongoose';

const RegisteredDeviceSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    deviceName: { type: String, required: true },
    deviceType: { type: String, enum: ['Tablet', 'Mobile', 'Desktop', 'POS_Terminal'], required: true },
    browserFingerprint: { type: String, required: true, unique: true },
    floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    status: { type: String, enum: ['Active', 'Inactive', 'Maintenance'], default: 'Active' },
    lastLogin: { type: Date },
    lastSeen: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
  },
  { timestamps: true }
);

RegisteredDeviceSchema.index({ restaurant: 1, browserFingerprint: 1 });

export default mongoose.models.RegisteredDevice || mongoose.model('RegisteredDevice', RegisteredDeviceSchema);

import mongoose from 'mongoose';

const RegisteredDeviceSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    deviceCode: { type: String, unique: true },
    deviceName: { type: String, required: true },
    deviceType: { type: String, enum: ['Tablet', 'Mobile', 'Desktop', 'POS Terminal', 'Kitchen Display', 'Self Ordering Kiosk'], required: true },
    assignedFloor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    description: { type: String },
    status: { type: String, enum: ['Active', 'Inactive', 'Maintenance', 'Retired'], default: 'Active' },
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    lastLoginAt: { type: Date },
    lastSeenAt: { type: Date },
    
    // Placeholders for future offline/PWA support (Not used currently)
    deviceUUID: { type: String },
    activationToken: { type: String },
    browserFingerprint: { type: String },
    registeredAt: { type: Date }
  },
  { timestamps: true }
);

RegisteredDeviceSchema.index({ restaurant: 1, deviceCode: 1 });

export default mongoose.models.RegisteredDevice || mongoose.model('RegisteredDevice', RegisteredDeviceSchema);

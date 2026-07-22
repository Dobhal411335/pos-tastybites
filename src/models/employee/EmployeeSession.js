import mongoose from 'mongoose';

const EmployeeSessionSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeShift' },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredDevice', required: true },
    loginTime: { type: Date, required: true, default: Date.now },
    logoutTime: { type: Date },
    duration: { type: Number },
    browserFingerprint: { type: String, required: true },
    ipAddress: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Terminated', 'Expired'], default: 'Active' }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

EmployeeSessionSchema.index({ employee: 1, status: 1 });
EmployeeSessionSchema.index({ device: 1, status: 1 });
EmployeeSessionSchema.index({ restaurant: 1, loginTime: -1 });

export default mongoose.models.EmployeeSession || mongoose.model('EmployeeSession', EmployeeSessionSchema);

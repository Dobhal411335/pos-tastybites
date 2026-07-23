import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, sparse: true }, // Generated on approval
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phoneNumber: { type: String, required: true },
    username: { type: String, lowercase: true, trim: true },
    password: { type: String }, // Bcrypt hash, generated on approval
    encryptedPassword: { type: String }, // AES encrypted, generated on approval
    profileImage: { type: String },
    role: { type: String, required: true },
    status: { type: String, enum: ['Pending Approval', 'Approved', 'Active', 'Suspended'], default: 'Pending Approval' },
    defaultFloor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    defaultSection: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    defaultShiftTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftTemplate' },
    permissionGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeePermission' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeColor: { type: String, default: '#4ade80' },
    assignedFloor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    assignedTables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }],
    assignedDevice: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredDevice' },
    availableDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
    weeklyOff: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
    leaveStatus: { type: String, enum: ['None', 'Vacation', 'Sick Leave'], default: 'None' },
    
    // Credential tracking
    credentialGenerated: { type: Boolean, default: false },
    credentialSent: { type: Boolean, default: false },
    credentialSentAt: { type: Date },
    passwordGeneratedAt: { type: Date }
  },
  { timestamps: true }
);

EmployeeSchema.index({ restaurant: 1, email: 1 }, { unique: true });
EmployeeSchema.index({ employeeId: 1 });

// Virtual for backward compatibility
EmployeeSchema.virtual('name').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

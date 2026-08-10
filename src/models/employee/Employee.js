import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, sparse: true }, // Generated on approval
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    countryCode: { type: String, default: '+1' },
    phoneNumber: { type: String, required: true },
    username: { type: String, lowercase: true, trim: true },
    password: { type: String }, // Bcrypt hash for login, generated on approval
    plainPassword: { type: String }, // Plain text for admin viewing only (never exposed in list APIs)
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
    hourlyPaid: {
      totalWorkingHours: { type: String },
      amountPerHour: { type: Number },
      totalAmountPerDay: { type: Number },
      overtimeAmountPerHour: { type: Number },
    },
    tipPercent: { type: Number, min: 0, max: 100 },
    staffDiscount: { type: Number },
    assignedFloor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    assignedTables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }],
    assignedDevice: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredDevice' },
    availableDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
    weeklyOff: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
    leaveStatus: { type: String, enum: ['None', 'Vacation', 'Sick Leave'], default: 'None' },
    
    // Device & Login Tracking
    deviceActivationRequired: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    lastLoginIP: { type: String },
    lastLoginPlatform: { type: String },
    lastLoginBrowser: { type: String },
    
    // Credential tracking
    credentialGenerated: { type: Boolean, default: false },
    credentialSent: { type: Boolean, default: false },
    credentialSentAt: { type: Date },
    passwordGeneratedAt: { type: Date }
  },
  { timestamps: true }
);

EmployeeSchema.index({ restaurant: 1, email: 1 }, { unique: true });

// Virtual for backward compatibility
EmployeeSchema.virtual('name').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

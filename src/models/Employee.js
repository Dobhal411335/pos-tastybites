import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true }, // Auto-generated human-readable ID
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true }, // Bcrypt hash
    profileImage: { type: String },
    role: { type: String, enum: ['Admin', 'Manager', 'Staff'], required: true },
    status: { type: String, enum: ['Active', 'On_Leave', 'Terminated'], default: 'Active' },
    defaultFloor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    defaultSection: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    permissionGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeePermission' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeColor: { type: String, default: '#4ade80' },
    assignedFloor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    assignedTables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }]
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

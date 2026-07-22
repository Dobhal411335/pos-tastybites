import mongoose from 'mongoose';

const EmployeeShiftSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    date: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    assignedFloor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    assignedSection: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    assignedTables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }],
    assignedDevice: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredDevice' },
    status: { type: String, enum: ['Scheduled', 'Active', 'Completed', 'Cancelled'], default: 'Scheduled' },
    totalHours: { type: Number, default: 0 },
    regularHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    notes: { type: String }
  },
  { timestamps: true }
);

// Ensure one active shift per employee at a time
EmployeeShiftSchema.index(
  { employee: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'Active' } }
);

export default mongoose.models.EmployeeShift || mongoose.model('EmployeeShift', EmployeeShiftSchema);

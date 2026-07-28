import mongoose from 'mongoose';

const EmployeeLogSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeShift' },
    dutyChange: { type: mongoose.Schema.Types.ObjectId, ref: 'DutyChange', default: null },
    date: { type: Date, required: true },
    scheduledShiftStart: { type: Date, default: null },
    scheduledShiftEnd: { type: Date, default: null },
    scheduledShiftMinutes: { type: Number, default: 0 },
    loginTime: { type: Date, required: true },
    logoutTime: { type: Date },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredDevice' },
    loginDeviceName: { type: String, default: '' },
    floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
    tablesAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }],
    workedMinutes: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    lateMinutes: { type: Number, default: 0 },
    earlyLeaveMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    isTemporaryDuty: { type: Boolean, default: false },
    shiftStatus: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'Off'],
      default: 'Scheduled'
    },
    isIncomplete: { type: Boolean, default: true },
    attendanceStatus: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Half Day', 'Leave', 'Holiday', 'Emergency Duty'],
      default: 'Present'
    },
  },
  { timestamps: true }
);

EmployeeLogSchema.index({ employee: 1, date: 1, restaurant: 1 }, { unique: true });
EmployeeLogSchema.index({ restaurant: 1, date: -1 });
EmployeeLogSchema.index({ restaurant: 1, attendanceStatus: 1, date: -1 });

export default mongoose.models.EmployeeLog || mongoose.model('EmployeeLog', EmployeeLogSchema);

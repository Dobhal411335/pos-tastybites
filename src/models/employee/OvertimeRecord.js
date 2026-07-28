import mongoose from 'mongoose';

/**
 * OvertimeRecord — created when admin approves overtime via DutyChange.
 *
 * Design notes:
 *  - estimatedHours is set at approval time by the admin.
 *  - actualHours is filled later automatically from EmployeeLog (login → logout duration).
 *  - Linked to both the DutyChange approval and the original EmployeeShift.
 *  - Future payroll integration can query this collection directly.
 */
const OvertimeRecordSchema = new mongoose.Schema(
  {
    employee:   { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    date:       { type: Date, required: true },

    // References
    dutyChange:   { type: mongoose.Schema.Types.ObjectId, ref: 'DutyChange', default: null },
    plannedShift: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeShift', default: null },

    reason:      { type: String, default: '' },
    approvedBy:  { type: String, default: '' },
    approvedById:{ type: mongoose.Schema.Types.ObjectId, default: null },
    approvedAt:  { type: Date, default: null },

    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved',
    },

    // Hours
    estimatedHours: { type: Number, default: 0 }, // set by admin at approval
    actualHours:    { type: Number, default: 0 }, // filled from EmployeeLog on logout (future automation)
  },
  { timestamps: true }
);

OvertimeRecordSchema.index({ employee: 1, date: 1 });
OvertimeRecordSchema.index({ restaurant: 1, status: 1 });
OvertimeRecordSchema.index({ restaurant: 1, date: -1 });

export default mongoose.models.OvertimeRecord || mongoose.model('OvertimeRecord', OvertimeRecordSchema);

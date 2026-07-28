import mongoose from 'mongoose';

/**
 * ShiftHistory — immutable audit log.
 *
 * Rules:
 *  - Documents are NEVER updated. Only inserted and read.
 *  - One record is created for every schedule event:
 *    schedule generation, duty change, login, logout, etc.
 *  - updatedAt is explicitly disabled (timestamps only writes createdAt).
 */
const ShiftHistorySchema = new mongoose.Schema(
  {
    employee:   { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    date:       { type: Date, required: true },  // affected day (midnight)

    eventType: {
      type: String,
      enum: [
        'ScheduleGenerated',  // bulk template application
        'ShiftChanged',       // ChangeShift duty change
        'DutyAssigned',       // AssignDuty on an OFF day
        'LeaveApproved',      // MarkLeave
        'HolidayMarked',      // MarkHoliday
        'OvertimeApproved',   // ApproveOvertime
        'DutyCancelled',      // CancelDuty or RestorePlanned
        'AbsentMarked',       // MarkAbsent
        'ShiftRestored',      // RestorePlanned
        'EmployeeLogin',      // employee logged in
        'EmployeeLogout',     // employee logged out
      ],
      required: true,
    },

    // Snapshot data before/after (Mixed — structure varies by eventType)
    originalData: { type: mongoose.Schema.Types.Mixed, default: null },
    updatedData:  { type: mongoose.Schema.Types.Mixed, default: null },

    // References (optional — for quick cross-querying)
    dutyChange:   { type: mongoose.Schema.Types.ObjectId, ref: 'DutyChange', default: null },
    plannedShift: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeShift', default: null },

    reason:        { type: String, default: '' },
    performedBy:   { type: String, default: '' },   // Name of admin/manager who made the change
    performedById: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  {
    // Immutable — only createdAt, no updatedAt
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

ShiftHistorySchema.index({ employee: 1, date: -1 });
ShiftHistorySchema.index({ restaurant: 1, createdAt: -1 });
ShiftHistorySchema.index({ restaurant: 1, eventType: 1 });

export default mongoose.models.ShiftHistory || mongoose.model('ShiftHistory', ShiftHistorySchema);

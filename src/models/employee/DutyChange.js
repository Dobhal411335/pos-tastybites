import mongoose from 'mongoose';

/**
 * DutyChange — stores every single-day deviation from the planned (EmployeeShift) schedule.
 *
 * Rules:
 *  - Only ONE active DutyChange per employee per date (enforced by compound index + API guard).
 *  - 'RestorePlanned' and 'CancelDuty' delete the existing DutyChange (instead of creating a new one).
 *  - Never modifies the original EmployeeShift document.
 *  - Each creation / deletion also writes a ShiftHistory record.
 */
const DutyChangeSchema = new mongoose.Schema(
  {
    employee:    { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    restaurant:  { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    date:        { type: Date, required: true },  // midnight of the affected day

    // The original planned EmployeeShift for this day (null if it was an OFF day)
    plannedShift: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeShift', default: null },

    changeType: {
      type: String,
      enum: [
        'AssignDuty',       // Employee is OFF — admin assigns a temporary duty
        'ChangeShift',      // Employee has a shift — admin changes the times / template
        'MarkLeave',        // Mark as any leave type
        'MarkHoliday',      // Mark as holiday (convenience alias)
        'ApproveOvertime',  // Approve post-shift overtime
        'CancelDuty',       // Cancel a previously assigned duty on an OFF day
        'MarkAbsent',       // Mark as absent
        'RestorePlanned',   // Undo any existing DutyChange → back to original plan
      ],
      required: true,
    },

    // Leave specifics (populated when changeType is MarkLeave or MarkHoliday)
    leaveType: {
      type: String,
      enum: ['Leave', 'Sick Leave', 'Emergency Leave', 'Holiday'],
      default: null,
    },

    // New shift details (populated when changeType is AssignDuty or ChangeShift)
    newShiftTemplate:  { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftTemplate', default: null },
    newStartTime:      { type: Date, default: null },
    newEndTime:        { type: Date, default: null },

    // Snapshot of original times (for history / diff display)
    originalStartTime: { type: Date, default: null },
    originalEndTime:   { type: Date, default: null },

    // Floor / table assignment override (AssignDuty / ChangeShift)
    assignedFloor:  { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', default: null },
    assignedTables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }],

    reason:       { type: String, default: '' },
    approvedBy:   { type: String, default: '' },      // Name string (flexible — admin or manager name)
    approvedById: { type: mongoose.Schema.Types.ObjectId, default: null }, // Admin/Employee ObjectId
    notes:        { type: String, default: '' },

    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved',
    },
  },
  { timestamps: true }
);

// One DutyChange per employee per day per restaurant
DutyChangeSchema.index({ employee: 1, date: 1, restaurant: 1 });
DutyChangeSchema.index({ restaurant: 1, date: -1 });

export default mongoose.models.DutyChange || mongoose.model('DutyChange', DutyChangeSchema);

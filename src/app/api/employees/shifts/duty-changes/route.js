import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";
import DutyChange from "@/models/employee/DutyChange";
import ShiftHistory from "@/models/employee/ShiftHistory";
import OvertimeRecord from "@/models/employee/OvertimeRecord";
import EmployeeShift from "@/models/employee/EmployeeShift";
import Employee from "@/models/employee/Employee";

// ─── GET ─────────────────────────────────────────────────────────────────────
// Fetch duty changes with optional date range + employee filter

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate  = searchParams.get("startDate");
    const endDate    = searchParams.get("endDate");
    const employeeId = searchParams.get("employeeId");

    const query = { restaurant: request.restaurant };

    if (startDate && endDate) {
      const start = new Date(startDate); start.setHours(0, 0, 0, 0);
      const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);
      query.date  = { $gte: start, $lte: end };
    }
    if (employeeId) query.employee = employeeId;

    const changes = await DutyChange.find(query)
      .populate("employee",        "firstName lastName employeeId role")
      .populate("plannedShift")
      .populate("newShiftTemplate")
      .populate("assignedFloor",   "name")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return sendSuccess(changes, "Duty changes retrieved successfully");
  } catch (error) {
    logger.error("Failed to fetch duty changes", error);
    return sendError(error, "Failed to fetch duty changes", 500);
  }
}, ["ADMIN", "MANAGER"]);

// ─── POST ─────────────────────────────────────────────────────────────────────
// Create a new DutyChange record.
// RestorePlanned / CancelDuty DELETE the existing change instead of creating a new one.

export const POST = withAuth(async (request) => {
  try {
    const data = await request.json();
    const {
      employeeId, date, plannedShiftId, changeType,
      leaveType, newShiftTemplateId, newStartTime, newEndTime,
      reason, approvedBy, notes, assignedFloor, assignedTables, estimatedHours,
    } = data;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!employeeId || !date || !changeType) {
      return sendError(new Error("Missing required fields"), "employeeId, date, and changeType are required", 400);
    }

    const validTypes = [
      'AssignDuty', 'ChangeShift', 'MarkLeave', 'MarkHoliday',
      'ApproveOvertime', 'CancelDuty', 'MarkAbsent', 'RestorePlanned',
    ];
    if (!validTypes.includes(changeType)) {
      return sendError(new Error("Invalid changeType"), `changeType must be one of: ${validTypes.join(', ')}`, 400);
    }

    // ── Employee ownership check ─────────────────────────────────────────────
    const employee = await Employee.findOne({ _id: employeeId, restaurant: request.restaurant });
    if (!employee) return sendError(new Error("Not Found"), "Employee not found", 404);

    // ── Date normalisation ───────────────────────────────────────────────────
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    // ── Check for existing DutyChange for this employee+day ──────────────────
    const existingChange = await DutyChange.findOne({
      employee:   employeeId,
      restaurant: request.restaurant,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const isRestorative = ['RestorePlanned', 'CancelDuty'].includes(changeType);

    if (existingChange && !isRestorative) {
      return sendError(
        new Error("Conflict"),
        "A duty change already exists for this employee on this day. Use 'Restore Planned' or 'Cancel Duty' to undo it first.",
        409
      );
    }

    // ── RestorePlanned / CancelDuty — delete the existing change ────────────
    if (isRestorative) {
      if (!existingChange) {
        return sendError(new Error("Not Found"), "No active duty change found for this employee on this day.", 404);
      }

      const eventType = changeType === 'RestorePlanned' ? 'ShiftRestored' : 'DutyCancelled';
      await ShiftHistory.create({
        employee:     employeeId,
        restaurant:   request.restaurant,
        date:         startOfDay,
        eventType,
        originalData: existingChange,
        updatedData:  null,
        dutyChange:   existingChange._id,
        plannedShift: plannedShiftId || existingChange.plannedShift,
        reason:       reason || 'Admin action',
        performedBy:  approvedBy || 'Admin',
        performedById: request.user.id,
      });

      await DutyChange.findByIdAndDelete(existingChange._id);

      const message = changeType === 'RestorePlanned'
        ? 'Shift restored to planned schedule'
        : 'Assigned duty cancelled successfully';

      logger.info(`DutyChange ${eventType} — employee:${employeeId} date:${date}`);
      return sendSuccess(null, message);
    }

    // ── Resolve planned shift (if provided) ──────────────────────────────────
    let plannedShift = null;
    if (plannedShiftId) {
      plannedShift = await EmployeeShift.findOne({ _id: plannedShiftId, restaurant: request.restaurant });
    }

    // ── Build DutyChange document ─────────────────────────────────────────────
    const dcData = {
      employee:     employeeId,
      restaurant:   request.restaurant,
      date:         startOfDay,
      plannedShift: plannedShiftId || null,
      changeType,
      reason:       reason || '',
      approvedBy:   approvedBy || '',
      approvedById: request.user.id,
      notes:        notes || '',
      status:       'Approved',
    };

    if (changeType === 'MarkLeave' || changeType === 'MarkHoliday') {
      dcData.leaveType = leaveType || (changeType === 'MarkHoliday' ? 'Holiday' : 'Leave');
      if (plannedShift) {
        dcData.originalStartTime = plannedShift.startTime;
        dcData.originalEndTime   = plannedShift.endTime;
      }
    }

    if (changeType === 'AssignDuty' || changeType === 'ChangeShift') {
      if (newShiftTemplateId) dcData.newShiftTemplate = newShiftTemplateId;
      if (newStartTime)       dcData.newStartTime = new Date(newStartTime);
      if (newEndTime)         dcData.newEndTime   = new Date(newEndTime);
      if (plannedShift) {
        dcData.originalStartTime = plannedShift.startTime;
        dcData.originalEndTime   = plannedShift.endTime;
      }
      if (assignedFloor)  dcData.assignedFloor  = assignedFloor;
      if (assignedTables) dcData.assignedTables = assignedTables;
    }

    if (changeType === 'MarkAbsent' && plannedShift) {
      dcData.originalStartTime = plannedShift.startTime;
      dcData.originalEndTime   = plannedShift.endTime;
    }

    const newDutyChange = await DutyChange.create(dcData);

    // ── Write ShiftHistory (audit) ───────────────────────────────────────────
    const eventTypeMap = {
      AssignDuty:      'DutyAssigned',
      ChangeShift:     'ShiftChanged',
      MarkLeave:       'LeaveApproved',
      MarkHoliday:     'HolidayMarked',
      ApproveOvertime: 'OvertimeApproved',
      MarkAbsent:      'AbsentMarked',
    };

    await ShiftHistory.create({
      employee:     employeeId,
      restaurant:   request.restaurant,
      date:         startOfDay,
      eventType:    eventTypeMap[changeType] || 'ShiftChanged',
      originalData: plannedShift
        ? { shiftType: plannedShift.shiftType, startTime: plannedShift.startTime, endTime: plannedShift.endTime }
        : null,
      updatedData:  { changeType, ...dcData },
      dutyChange:   newDutyChange._id,
      plannedShift: plannedShiftId || null,
      reason:       reason || '',
      performedBy:  approvedBy || '',
      performedById: request.user.id,
    });

    // ── Create OvertimeRecord if approving overtime ──────────────────────────
    if (changeType === 'ApproveOvertime') {
      await OvertimeRecord.create({
        employee:      employeeId,
        restaurant:    request.restaurant,
        date:          startOfDay,
        dutyChange:    newDutyChange._id,
        plannedShift:  plannedShiftId || null,
        reason:        reason || '',
        approvedBy:    approvedBy || '',
        approvedById:  request.user.id,
        approvedAt:    new Date(),
        status:        'Approved',
        estimatedHours: estimatedHours ? Number(estimatedHours) : 0,
      });
    }

    // ── Return populated result ───────────────────────────────────────────────
    const populated = await DutyChange.findById(newDutyChange._id)
      .populate("employee",        "firstName lastName employeeId role")
      .populate("plannedShift")
      .populate("newShiftTemplate")
      .lean();

    logger.info(`DutyChange created — type:${changeType} employee:${employeeId} date:${date}`);
    return sendSuccess(populated, `${changeType} recorded successfully`, 201);
  } catch (error) {
    logger.error("Failed to create duty change", error);
    return sendError(error, "Failed to create duty change", 500);
  }
}, ["ADMIN", "MANAGER"]);

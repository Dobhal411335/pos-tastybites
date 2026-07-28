import EmployeeLog from "@/models/employee/EmployeeLog";
import EmployeeShift from "@/models/employee/EmployeeShift";
import DutyChange from "@/models/employee/DutyChange";
import OvertimeRecord from "@/models/employee/OvertimeRecord";
import ShiftHistory from "@/models/employee/ShiftHistory";

const MINUTES_PER_HOUR = 60;

export const getAttendanceDayBounds = (value) => {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const end = new Date(value);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const diffMinutes = (later, earlier) => {
  if (!later || !earlier) return 0;
  return Math.max(0, Math.round((new Date(later) - new Date(earlier)) / 60000));
};

export async function resolveAttendanceSchedule({ employeeId, restaurantId, shiftId = null, date = new Date() }) {
  const { start, end } = getAttendanceDayBounds(date);
  const dutyChange = await DutyChange.findOne({
    employee: employeeId,
    restaurant: restaurantId,
    date: { $gte: start, $lte: end },
    status: "Approved",
  }).lean();

  let shift = null;
  if (shiftId) {
    shift = await EmployeeShift.findOne({ _id: shiftId, restaurant: restaurantId }).lean();
  }
  if (!shift) {
    shift = await EmployeeShift.findOne({
      employee: employeeId,
      restaurant: restaurantId,
      date: { $gte: start, $lte: end },
    }).lean();
  }

  if (dutyChange?.changeType === "MarkAbsent") {
    return { shift, dutyChange, attendanceStatus: "Absent", shiftStatus: "Cancelled", scheduledShiftStart: null, scheduledShiftEnd: null, scheduledShiftMinutes: 0, isTemporaryDuty: false };
  }
  if (dutyChange?.changeType === "MarkLeave") {
    return { shift, dutyChange, attendanceStatus: "Leave", shiftStatus: "Cancelled", scheduledShiftStart: null, scheduledShiftEnd: null, scheduledShiftMinutes: 0, isTemporaryDuty: false };
  }
  if (dutyChange?.changeType === "MarkHoliday") {
    return { shift, dutyChange, attendanceStatus: "Holiday", shiftStatus: "Cancelled", scheduledShiftStart: null, scheduledShiftEnd: null, scheduledShiftMinutes: 0, isTemporaryDuty: false };
  }
  if (shift?.status === "Cancelled") {
    return { shift, dutyChange, attendanceStatus: "Absent", shiftStatus: "Cancelled", scheduledShiftStart: shift.startTime || null, scheduledShiftEnd: shift.endTime || null, scheduledShiftMinutes: 0, isTemporaryDuty: false };
  }

  const isTemporaryDuty = dutyChange?.changeType === "AssignDuty";
  const scheduledShiftStart = dutyChange?.newStartTime || shift?.startTime || null;
  const scheduledShiftEnd = dutyChange?.newEndTime || shift?.endTime || null;

  return {
    shift,
    dutyChange,
    attendanceStatus: isTemporaryDuty ? "Emergency Duty" : "Present",
    shiftStatus: shift?.status === "Cancelled" ? "Cancelled" : (shift ? "Scheduled" : "Off"),
    scheduledShiftStart,
    scheduledShiftEnd,
    scheduledShiftMinutes: diffMinutes(scheduledShiftEnd, scheduledShiftStart),
    isTemporaryDuty,
    floor: dutyChange?.assignedFloor || shift?.assignedFloor || null,
    tablesAssigned: dutyChange?.assignedTables?.length ? dutyChange.assignedTables : (shift?.assignedTables || []),
  };
}

export function computeAttendanceMetrics(log) {
  const workedMinutes = log.logoutTime ? diffMinutes(log.logoutTime, log.loginTime) : 0;
  const lateMinutes = log.scheduledShiftStart ? diffMinutes(log.loginTime, log.scheduledShiftStart) : 0;
  const earlyLeaveMinutes = log.logoutTime && log.scheduledShiftEnd ? diffMinutes(log.scheduledShiftEnd, log.logoutTime) : 0;

  let overtimeMinutes = 0;
  if (
    log.logoutTime &&
    !log.isIncomplete &&
    log.shiftStatus !== "Cancelled" &&
    log.attendanceStatus !== "Absent" &&
    log.scheduledShiftMinutes > 0
  ) {
    overtimeMinutes = Math.max(0, workedMinutes - log.scheduledShiftMinutes);
  }

  let attendanceStatus = log.attendanceStatus;
  if (!log.logoutTime) {
    return { workedMinutes: 0, lateMinutes, earlyLeaveMinutes: 0, overtimeMinutes: 0, attendanceStatus };
  }
  if (log.isTemporaryDuty) {
    attendanceStatus = "Emergency Duty";
  } else if (workedMinutes === 0) {
    attendanceStatus = "Absent";
  } else if (log.scheduledShiftMinutes > 0 && workedMinutes < Math.ceil(log.scheduledShiftMinutes / 2)) {
    attendanceStatus = "Half Day";
  } else if (lateMinutes > 0) {
    attendanceStatus = "Late";
  } else {
    attendanceStatus = "Present";
  }

  return { workedMinutes, lateMinutes, earlyLeaveMinutes, overtimeMinutes, attendanceStatus };
}

export async function upsertAttendanceOnClockIn({ employee, shiftId, device, loginTime = new Date() }) {
  const schedule = await resolveAttendanceSchedule({
    employeeId: employee._id,
    restaurantId: employee.restaurant,
    shiftId,
    date: loginTime,
  });
  const { start, end } = getAttendanceDayBounds(loginTime);

  const log = await EmployeeLog.findOneAndUpdate(
    {
      employee: employee._id,
      restaurant: employee.restaurant,
      date: { $gte: start, $lte: end },
    },
    {
      $set: {
        shift: schedule.shift?._id || shiftId || null,
        dutyChange: schedule.dutyChange?._id || null,
        date: start,
        scheduledShiftStart: schedule.scheduledShiftStart,
        scheduledShiftEnd: schedule.scheduledShiftEnd,
        scheduledShiftMinutes: schedule.scheduledShiftMinutes,
        loginTime,
        device: device?._id || null,
        loginDeviceName: device?.deviceName || "",
        floor: schedule.floor || employee.assignedFloor || null,
        tablesAssigned: schedule.tablesAssigned || employee.assignedTables || [],
        attendanceStatus: schedule.attendanceStatus,
        shiftStatus: schedule.shiftStatus,
        isTemporaryDuty: schedule.isTemporaryDuty,
        isIncomplete: true,
      },
    },
    { new: true, upsert: true }
  );

  await ShiftHistory.create({
    employee: employee._id,
    restaurant: employee.restaurant,
    date: start,
    eventType: "EmployeeLogin",
    updatedData: {
      loginTime,
      shift: log.shift,
      dutyChange: log.dutyChange,
      device: log.device,
      floor: log.floor,
      tablesAssigned: log.tablesAssigned,
    },
    plannedShift: log.shift || null,
    dutyChange: log.dutyChange || null,
  });

  return log;
}

export async function finalizeAttendanceOnClockOut({ session, logoutTime = new Date() }) {
  const { start, end } = getAttendanceDayBounds(session.loginTime);
  const log = await EmployeeLog.findOne({
    employee: session.employee,
    restaurant: session.restaurant,
    date: { $gte: start, $lte: end },
  });

  if (!log) return null;

  log.logoutTime = logoutTime;
  log.isIncomplete = false;

  const metrics = computeAttendanceMetrics(log);
  log.workedMinutes = metrics.workedMinutes;
  log.actualHours = Number((metrics.workedMinutes / MINUTES_PER_HOUR).toFixed(2));
  log.lateMinutes = metrics.lateMinutes;
  log.earlyLeaveMinutes = metrics.earlyLeaveMinutes;
  log.overtimeMinutes = metrics.overtimeMinutes;
  log.attendanceStatus = metrics.attendanceStatus;

  await log.save();

  await OvertimeRecord.updateMany(
    { employee: session.employee, restaurant: session.restaurant, date: { $gte: start, $lte: end } },
    { $set: { actualHours: Number((metrics.overtimeMinutes / MINUTES_PER_HOUR).toFixed(2)) } }
  );

  await ShiftHistory.create({
    employee: session.employee,
    restaurant: session.restaurant,
    date: start,
    eventType: "EmployeeLogout",
    updatedData: {
      logoutTime,
      workedMinutes: log.workedMinutes,
      lateMinutes: log.lateMinutes,
      earlyLeaveMinutes: log.earlyLeaveMinutes,
      overtimeMinutes: log.overtimeMinutes,
      attendanceStatus: log.attendanceStatus,
    },
    plannedShift: log.shift || null,
    dutyChange: log.dutyChange || null,
  });

  return log;
}

export async function recalculateAttendanceLog(log) {
  const metrics = computeAttendanceMetrics(log);
  log.workedMinutes = metrics.workedMinutes;
  log.actualHours = Number((metrics.workedMinutes / MINUTES_PER_HOUR).toFixed(2));
  log.lateMinutes = metrics.lateMinutes;
  log.earlyLeaveMinutes = metrics.earlyLeaveMinutes;
  log.overtimeMinutes = metrics.overtimeMinutes;
  log.attendanceStatus = metrics.attendanceStatus;
  log.isIncomplete = !log.logoutTime;
  await log.save();
  return log;
}

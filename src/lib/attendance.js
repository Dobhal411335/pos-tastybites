import EmployeeLog from "@/models/employee/EmployeeLog";
import EmployeeShift from "@/models/employee/EmployeeShift";
import EmployeeSession from "@/models/employee/EmployeeSession";
import DutyChange from "@/models/employee/DutyChange";
import OvertimeRecord from "@/models/employee/OvertimeRecord";
import ShiftHistory from "@/models/employee/ShiftHistory";
import {
  restaurantCalendarDate,
  restaurantDayBounds,
} from "@/lib/restaurantTime";

const MINUTES_PER_HOUR = 60;

/** Restaurant-local day window. `end` is exclusive. */
export const getAttendanceDayBounds = (value) => restaurantDayBounds(value);

const diffMinutes = (later, earlier) => {
  if (!later || !earlier) return 0;
  return Math.max(0, Math.round((new Date(later) - new Date(earlier)) / 60000));
};

export function resolveScheduleFromDocs(shift, dutyChange, { clockedIn = true } = {}) {
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
  const scheduledShiftMinutes = diffMinutes(scheduledShiftEnd, scheduledShiftStart);
  const hasDuty = Boolean(shift || isTemporaryDuty || dutyChange?.changeType === "ChangeShift");

  if (!clockedIn) {
    if (!hasDuty) {
      return {
        shift,
        dutyChange,
        attendanceStatus: "Off",
        shiftStatus: "Off",
        scheduledShiftStart: null,
        scheduledShiftEnd: null,
        scheduledShiftMinutes: 0,
        isTemporaryDuty: false,
        floor: null,
        tablesAssigned: [],
      };
    }
    return {
      shift,
      dutyChange,
      attendanceStatus: "Absent",
      shiftStatus: "Scheduled",
      scheduledShiftStart,
      scheduledShiftEnd,
      scheduledShiftMinutes,
      isTemporaryDuty,
      floor: dutyChange?.assignedFloor || shift?.assignedFloor || null,
      tablesAssigned: dutyChange?.assignedTables?.length ? dutyChange.assignedTables : (shift?.assignedTables || []),
    };
  }

  return {
    shift,
    dutyChange,
    attendanceStatus: isTemporaryDuty ? "Emergency Duty" : "Present",
    shiftStatus: shift?.status === "Cancelled" ? "Cancelled" : (shift ? "Scheduled" : "Off"),
    scheduledShiftStart,
    scheduledShiftEnd,
    scheduledShiftMinutes,
    isTemporaryDuty,
    floor: dutyChange?.assignedFloor || shift?.assignedFloor || null,
    tablesAssigned: dutyChange?.assignedTables?.length ? dutyChange.assignedTables : (shift?.assignedTables || []),
  };
}

export async function resolveAttendanceSchedule({ employeeId, restaurantId, shiftId = null, date = new Date() }) {
  const { start, end } = getAttendanceDayBounds(date);
  const dutyChange = await DutyChange.findOne({
    employee: employeeId,
    restaurant: restaurantId,
    date: { $gte: start, $lt: end },
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
      date: { $gte: start, $lt: end },
    }).lean();
  }

  return resolveScheduleFromDocs(shift, dutyChange, { clockedIn: true });
}

export async function sumSessionWorkedMinutes({
  employeeId,
  restaurantId,
  start,
  end,
  now = new Date(),
}) {
  const sessions = await EmployeeSession.find({
    employee: employeeId,
    restaurant: restaurantId,
    loginTime: { $gte: start, $lt: end },
  })
    .select("loginTime logoutTime duration status")
    .lean();

  let seconds = 0;
  for (const session of sessions) {
    const stored = Number(session.duration);
    if (Number.isFinite(stored) && stored > 0 && session.status !== "Active") {
      seconds += stored;
      continue;
    }
    const loginMs = session.loginTime ? new Date(session.loginTime).getTime() : null;
    if (!loginMs) continue;
    const endMs = session.logoutTime
      ? new Date(session.logoutTime).getTime()
      : session.status === "Active"
        ? now.getTime()
        : loginMs;
    seconds += Math.max(0, Math.floor((endMs - loginMs) / 1000));
  }
  return Math.round(seconds / 60);
}

export function computeAttendanceMetrics(log, { workedMinutes: overrideMinutes } = {}) {
  const workedMinutes =
    overrideMinutes != null
      ? Math.max(0, Math.round(Number(overrideMinutes) || 0))
      : log.logoutTime
        ? diffMinutes(log.logoutTime, log.loginTime)
        : 0;
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
  if (log.isIncomplete || !log.logoutTime) {
    return { workedMinutes, lateMinutes, earlyLeaveMinutes: 0, overtimeMinutes: 0, attendanceStatus };
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
  const calendarDate = restaurantCalendarDate(loginTime);

  const existing = await EmployeeLog.findOne({
    employee: employee._id,
    restaurant: employee.restaurant,
    date: { $gte: start, $lt: end },
  });

  const scheduleFields = {
    shift: schedule.shift?._id || shiftId || existing?.shift || null,
    dutyChange: schedule.dutyChange?._id || null,
    date: existing?.date || calendarDate,
    scheduledShiftStart: schedule.scheduledShiftStart,
    scheduledShiftEnd: schedule.scheduledShiftEnd,
    scheduledShiftMinutes: schedule.scheduledShiftMinutes,
    floor: schedule.floor || null,
    tablesAssigned: schedule.tablesAssigned || [],
    attendanceStatus: schedule.attendanceStatus,
    shiftStatus: schedule.shiftStatus,
    isTemporaryDuty: schedule.isTemporaryDuty,
    isIncomplete: true,
    logoutTime: null,
  };

  let log;
  if (!existing) {
    log = await EmployeeLog.create({
      employee: employee._id,
      restaurant: employee.restaurant,
      ...scheduleFields,
      loginTime,
      device: device?._id || null,
      loginDeviceName: device?.deviceName || "",
    });
  } else {
    Object.assign(existing, scheduleFields);
    await existing.save();
    log = existing;
  }

  await ShiftHistory.create({
    employee: employee._id,
    restaurant: employee.restaurant,
    date: log.date || calendarDate,
    eventType: "EmployeeLogin",
    updatedData: {
      loginTime,
      firstClockIn: log.loginTime,
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
    date: { $gte: start, $lt: end },
  });

  if (!log) return null;

  const remainingActive = await EmployeeSession.countDocuments({
    employee: session.employee,
    restaurant: session.restaurant,
    status: "Active",
    loginTime: { $gte: start, $lt: end },
  });

  const workedMinutes = await sumSessionWorkedMinutes({
    employeeId: session.employee,
    restaurantId: session.restaurant,
    start,
    end,
    now: logoutTime,
  });

  const latestClosed = await EmployeeSession.findOne({
    employee: session.employee,
    restaurant: session.restaurant,
    loginTime: { $gte: start, $lt: end },
    logoutTime: { $ne: null },
  })
    .sort({ logoutTime: -1 })
    .select("logoutTime")
    .lean();

  log.isIncomplete = remainingActive > 0;
  log.logoutTime = remainingActive > 0 ? null : (latestClosed?.logoutTime || logoutTime);

  const metrics = computeAttendanceMetrics(log, { workedMinutes });
  log.workedMinutes = metrics.workedMinutes;
  log.actualHours = Number((metrics.workedMinutes / MINUTES_PER_HOUR).toFixed(2));
  log.lateMinutes = metrics.lateMinutes;
  log.earlyLeaveMinutes = metrics.earlyLeaveMinutes;
  log.overtimeMinutes = metrics.overtimeMinutes;
  log.attendanceStatus = metrics.attendanceStatus;

  await log.save();

  await OvertimeRecord.updateMany(
    { employee: session.employee, restaurant: session.restaurant, date: { $gte: start, $lt: end } },
    { $set: { actualHours: Number((metrics.overtimeMinutes / MINUTES_PER_HOUR).toFixed(2)) } }
  );

  await ShiftHistory.create({
    employee: session.employee,
    restaurant: session.restaurant,
    date: log.date || start,
    eventType: "EmployeeLogout",
    updatedData: {
      logoutTime,
      workedMinutes: log.workedMinutes,
      lateMinutes: log.lateMinutes,
      earlyLeaveMinutes: log.earlyLeaveMinutes,
      overtimeMinutes: log.overtimeMinutes,
      attendanceStatus: log.attendanceStatus,
      isIncomplete: log.isIncomplete,
    },
    plannedShift: log.shift || null,
    dutyChange: log.dutyChange || null,
  });

  return log;
}

export async function recalculateAttendanceLog(log) {
  const { start, end } = getAttendanceDayBounds(log.date || log.loginTime);
  const remainingActive = await EmployeeSession.countDocuments({
    employee: log.employee,
    restaurant: log.restaurant,
    status: "Active",
    loginTime: { $gte: start, $lt: end },
  });
  const workedMinutes = await sumSessionWorkedMinutes({
    employeeId: log.employee,
    restaurantId: log.restaurant,
    start,
    end,
  });
  log.isIncomplete = remainingActive > 0 || !log.logoutTime;
  const metrics = computeAttendanceMetrics(log, { workedMinutes });
  log.workedMinutes = metrics.workedMinutes;
  log.actualHours = Number((metrics.workedMinutes / MINUTES_PER_HOUR).toFixed(2));
  log.lateMinutes = metrics.lateMinutes;
  log.earlyLeaveMinutes = metrics.earlyLeaveMinutes;
  log.overtimeMinutes = metrics.overtimeMinutes;
  log.attendanceStatus = metrics.attendanceStatus;
  await log.save();
  return log;
}

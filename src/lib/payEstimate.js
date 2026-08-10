const MINUTES_PER_HOUR = 60;

export function buildPayEstimateFields() {
  return [
    {
      $addFields: {
        hourlyRate: { $ifNull: ["$employee.hourlyPaid.amountPerHour", 0] },
        regularMinutes: {
          $max: [0, { $subtract: ["$totalWorkedMinutes", "$totalOvertimeMinutes"] }],
        },
      },
    },
    {
      $addFields: {
        regularHours: { $divide: ["$regularMinutes", MINUTES_PER_HOUR] },
        overtimeHours: { $divide: ["$totalOvertimeMinutes", MINUTES_PER_HOUR] },
        totalWorkedHours: { $divide: ["$totalWorkedMinutes", MINUTES_PER_HOUR] },
      },
    },
    {
      $addFields: {
        regularPay: {
          $round: [{ $multiply: ["$regularHours", "$hourlyRate"] }, 2],
        },
        overtimePay: {
          $round: [{ $multiply: ["$overtimeHours", "$hourlyRate"] }, 2],
        },
      },
    },
    {
      $addFields: {
        estimatedTotalPay: {
          $round: [{ $add: ["$regularPay", "$overtimePay"] }, 2],
        },
      },
    },
  ];
}

export function buildWorkingHoursSummaryPipeline(match) {
  return [
    { $match: match },
    {
      $group: {
        _id: "$employee",
        totalWorkedMinutes: { $sum: "$workedMinutes" },
        totalLateMinutes: { $sum: "$lateMinutes" },
        totalEarlyLeaveMinutes: { $sum: "$earlyLeaveMinutes" },
        totalOvertimeMinutes: { $sum: "$overtimeMinutes" },
        daysWorked: { $sum: { $cond: [{ $gt: ["$workedMinutes", 0] }, 1, 0] } },
        incompleteDays: { $sum: { $cond: ["$isIncomplete", 1, 0] } },
      },
    },
    {
      $lookup: {
        from: "employees",
        localField: "_id",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: "$employee" },
    ...buildPayEstimateFields(),
    { $sort: { "employee.firstName": 1, "employee.lastName": 1 } },
  ];
}

export function buildDateRangeMatch(restaurantId, startDate, endDate) {
  const match = { restaurant: restaurantId };
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    match.date = { $gte: start, $lte: end };
  }
  return match;
}

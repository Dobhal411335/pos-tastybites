import { withAuth } from "@/utils/auth";
import { sendSuccess } from "@/utils/apiResponse";
import EmployeeLog from "@/models/employee/EmployeeLog";

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const match = { restaurant: request.restaurant };
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (startDate && endDate) {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    match.date = { $gte: start, $lte: end };
  }

  const summary = await EmployeeLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$employee",
        totalWorkedMinutes: { $sum: "$workedMinutes" },
        totalLateMinutes: { $sum: "$lateMinutes" },
        totalEarlyLeaveMinutes: { $sum: "$earlyLeaveMinutes" },
        totalOvertimeMinutes: { $sum: "$overtimeMinutes" },
        daysWorked: { $sum: { $cond: [{ $gt: ["$workedMinutes", 0] }, 1, 0] } },
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
    { $sort: { "employee.firstName": 1, "employee.lastName": 1 } },
  ]);

  return sendSuccess(summary, "Working hours summary retrieved successfully");
}, ["ADMIN", "MANAGER"]);

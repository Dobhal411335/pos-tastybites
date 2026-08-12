import { withAuth } from "@/utils/auth";
import EmployeeSession from "@/models/employee/EmployeeSession";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";

/**
 * GET /api/sales/online
 * Active logins for the restaurant (count + names).
 * Available to floor staff — not admin-only.
 */
export const GET = withAuth(async (request) => {
  try {
    const sessions = await EmployeeSession.find({
      restaurant: request.restaurant,
      status: "Active",
    })
      .populate("employee", "firstName lastName name role employeeId")
      .sort({ loginTime: 1 })
      .lean();

    const seen = new Set();
    const online = [];

    for (const s of sessions) {
      const emp = s.employee;
      if (!emp?._id) continue;
      const id = String(emp._id);
      if (seen.has(id)) continue; // one row per employee if multi-device
      seen.add(id);

      const name =
        emp.name ||
        [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim() ||
        "Unknown";

      online.push({
        id,
        name,
        role: emp.role || "",
        employeeId: emp.employeeId || "",
        loginTime: s.loginTime,
      });
    }

    return sendSuccess(
      {
        count: online.length,
        online,
      },
      "Online employees"
    );
  } catch (error) {
    console.error("Sales online employees error:", error);
    return sendError(error, "Failed to load online employees", 500);
  }
}, ["ADMIN", "MANAGER", "SERVER", "BARTENDER", "EMPLOYEE", "STAFF"]);

import connectDB from "@/lib/db";
import Employee from "@/models/employee/Employee";
import { sendError } from "@/utils/errorHandler";
import { withAuth } from '@/utils/auth';
import { logger } from "@/utils/logger";
import { sendSuccess } from '@/utils/apiResponse';

export const GET = withAuth(async (request) => {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Employee ID is required", 400);
    }

    const employee = await Employee.findOne({ _id: id, restaurant: request.restaurant })
      .select("email plainPassword passcode credentialGenerated");
    
    if (!employee) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    if (!employee.plainPassword && !employee.passcode) {
      return sendError(
        new Error("No Credentials"),
        "No password or passcode found for this employee. Please approve or set a passcode.",
        404
      );
    }

    logger.info(`Credentials viewed for employee ${employee.email}`);

    return sendSuccess({
      password: employee.plainPassword || null,
      passcode: employee.passcode || null,
    }, "Credentials retrieved successfully");
  } catch (error) {
    logger.error("Failed to fetch credentials", error);
    return sendError(error, "Failed to fetch credentials", 500);
  }
}, ["ADMIN", "MANAGER"]);

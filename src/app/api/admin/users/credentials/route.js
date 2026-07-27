import connectDB from "@/lib/db";
import Admin from "@/models/Admin";
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
      return sendError(new Error("Missing ID"), "Admin ID is required", 400);
    }

    const isSuperAdmin = request.role === 'Super Admin' || request.role === 'ADMIN';
    const isSelf = String(request.user.id) === String(id);

    if (!isSuperAdmin && !isSelf) {
      return sendError(new Error("Forbidden"), "You can only view your own credentials", 403);
    }

    const admin = await Admin.findById(id).select("email plainPassword");
    
    if (!admin) {
      return sendError(new Error("Not Found"), "Admin not found", 404);
    }

    if (!admin.plainPassword) {
      return sendError(
        new Error("No Password"),
        "No password found for this admin. Please reset their password.",
        404
      );
    }

    logger.info(`Credentials viewed for admin ${admin.email} by user ${request.user.id}`);

    return sendSuccess({ password: admin.plainPassword }, "Credentials retrieved successfully");
  } catch (error) {
    logger.error("Failed to fetch credentials", error);
    return sendError(error, "Failed to fetch credentials", 500);
  }
});

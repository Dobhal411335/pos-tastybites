import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Admin from "@/models/Admin";
import { sendError } from "@/utils/errorHandler";
import { withAuth } from '@/utils/auth';
import { decryptString } from "@/utils/crypto";
import { logger } from "@/utils/logger";
import { sendSuccess } from '@/utils/apiResponse';

export const GET = withAuth(async (request) => {
  try {
    await connectDB();
    
    // Only Super Admin can view admin credentials
    if (request.role !== 'Super Admin' && request.role !== 'ADMIN') {
      return sendError(new Error("Forbidden"), "Only Super Admins can view credentials", 403);
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendError(new Error("Missing ID"), "Admin ID is required", 400);
    }

    const admin = await Admin.findById(id);
    
    if (!admin) {
      return sendError(new Error("Not Found"), "Admin not found", 404);
    }

    if (!admin.encryptedPassword) {
      return sendError(new Error("No Password"), "No encrypted password found for this admin", 404);
    }

    const password = decryptString(admin.encryptedPassword);
    
    if (!password) {
      return sendError(new Error("Decryption Failed"), "Failed to decrypt password", 500);
    }

    logger.info(`Credentials viewed for admin ${admin.email} by user ${request.user.id}`);

    return sendSuccess({ password }, "Credentials decrypted successfully");
  } catch (error) {
    logger.error("Failed to decrypt credentials", error);
    return sendError(error, "Failed to decrypt credentials", 500);
  }
});

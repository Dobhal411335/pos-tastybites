import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Employee from "@/models/employee/Employee";
import { sendError } from "@/utils/errorHandler";
import { withAuth } from '@/utils/auth';
import { decryptString } from "@/utils/crypto";
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

    const employee = await Employee.findOne({ _id: id, restaurant: request.restaurant });
    
    if (!employee) {
      return sendError(new Error("Not Found"), "Employee not found", 404);
    }

    if (!employee.encryptedPassword) {
      return sendError(new Error("No Password"), "No encrypted password found for this employee", 404);
    }

    const password = decryptString(employee.encryptedPassword);
    
    if (!password) {
      return sendError(new Error("Decryption Failed"), "Failed to decrypt password", 500);
    }

    logger.info(`Credentials viewed for employee ${employee.email}`);

    return sendSuccess({ password }, "Credentials decrypted successfully");
  } catch (error) {
    logger.error("Failed to decrypt credentials", error);
    return sendError(error, "Failed to decrypt credentials", 500);
  }
}, ["ADMIN", "MANAGER"]);

import { withAuth } from "@/utils/auth";
import RegisteredDevice from "@/models/RegisteredDevice";
import { sendSuccess } from "@/utils/apiResponse";
import { sendError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

// Helper to generate the next device code
export async function getNextDeviceCode(restaurantId) {
  const lastDevice = await RegisteredDevice.findOne({ restaurant: restaurantId })
    .sort({ createdAt: -1 })
    .select("deviceCode")
    .lean();

  let nextSequence = 1;

  if (lastDevice && lastDevice.deviceCode && lastDevice.deviceCode.startsWith("DEV-")) {
    const lastNum = parseInt(lastDevice.deviceCode.replace("DEV-", ""), 10);
    if (!isNaN(lastNum)) {
      nextSequence = lastNum + 1;
    }
  }

  // Format to DEV-0001
  return `DEV-${String(nextSequence).padStart(4, "0")}`;
}

export const GET = withAuth(async (request) => {
  try {
    const nextCode = await getNextDeviceCode(request.restaurant);
    return sendSuccess({ nextCode }, "Next device code generated successfully");
  } catch (error) {
    logger.error("Failed to generate next device code", error);
    return sendError(error, "Failed to generate next device code", 500);
  }
}, ["ADMIN", "MANAGER"]);

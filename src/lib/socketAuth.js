import { jwtVerify } from "jose";
import connectDB from "./db.js";
import EmployeeSession from "../models/employee/EmployeeSession.js";
import RegisteredDevice from "../models/RegisteredDevice.js";
import Floor from "../models/floor/Floor.js";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-key-for-development-only",
);

function parseCookieHeader(cookieHeader = "") {
  const out = {};
  for (const part of String(cookieHeader).split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

async function verifyJwt(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Resolve Socket.IO auth context from handshake cookies.
 * Supports admin `token`, employee access token, or activated `device_token`.
 */
export async function resolveSocketAuth(handshake) {
  const cookies = parseCookieHeader(handshake?.headers?.cookie || "");
  const adminToken = cookies.token;
  const employeeToken = cookies.employee_access_token;
  const deviceToken = cookies.device_token;

  await connectDB();

  if (adminToken || employeeToken) {
    const payload = await verifyJwt(adminToken || employeeToken);
    if (!payload?.restaurantId) return null;

    if (payload.sessionId) {
      const session = await EmployeeSession.findById(payload.sessionId)
        .select("status")
        .lean();
      if (!session || session.status !== "Active") return null;
    }

    return {
      restaurantId: String(payload.restaurantId),
      userId: String(payload.userId || payload.employeeId || ""),
      employeeId: payload.employeeId ? String(payload.employeeId) : null,
      role: payload.role || null,
      authSource: adminToken ? "admin" : "employee",
    };
  }

  if (deviceToken) {
    const payload = await verifyJwt(deviceToken);
    if (!payload || payload.type !== "device" || !payload.deviceId) return null;

    const device = await RegisteredDevice.findById(payload.deviceId).lean();
    if (
      !device ||
      device.status !== "Active" ||
      device.activationStatus !== "Activated" ||
      device.deviceTokenVersion !== payload.version
    ) {
      return null;
    }

    return {
      restaurantId: String(device.restaurant),
      userId: String(device._id),
      employeeId: device.assignedEmployee
        ? String(device.assignedEmployee)
        : null,
      role: "DEVICE",
      authSource: "device",
    };
  }

  return null;
}

/**
 * Authorize a client-requested Socket.IO room against the authenticated context.
 */
export async function authorizeSocketRoom(auth, room) {
  if (!auth?.restaurantId || typeof room !== "string") return false;

  if (room === `restaurant:${auth.restaurantId}`) return true;

  if (room.startsWith("employee:")) {
    const target = room.slice("employee:".length);
    if (!target) return false;
    // Only join your own employee room (or assigned employee on a device).
    return (
      target === auth.userId ||
      (auth.employeeId && target === auth.employeeId)
    );
  }

  if (room.startsWith("floor:")) {
    const floorId = room.slice("floor:".length);
    if (!floorId) return false;
    const floor = await Floor.findOne({
      _id: floorId,
      restaurant: auth.restaurantId,
    })
      .select("_id")
      .lean();
    return Boolean(floor);
  }

  return false;
}

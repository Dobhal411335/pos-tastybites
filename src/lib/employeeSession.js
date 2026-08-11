import { decodeJwt } from 'jose';
import EmployeeSession from '@/models/employee/EmployeeSession';
import Employee from '@/models/employee/Employee';
import { signToken, verifyToken } from '@/utils/jwt';
import { finalizeAttendanceOnClockOut } from '@/lib/attendance';

/** Matches login + withEmployeeAuth: Active or Approved employees may hold a session. */
export function isEmployeeEligibleForSession(employee) {
  return Boolean(
    employee?.isActive &&
      (employee.status === 'Active' || employee.status === 'Approved')
  );
}

export async function markEmployeeSessionExpired(sessionId) {
  if (!sessionId) return null;
  return EmployeeSession.findOneAndUpdate(
    { _id: sessionId, status: 'Active' },
    { $set: { status: 'Expired' } },
    { returnDocument: 'after' }
  );
}

/**
 * Expire every Active login session for a restaurant.
 * Does not touch RegisteredDevice, device tokens, or employee records.
 */
export async function expireAllRestaurantSessions(restaurantId) {
  if (!restaurantId) return { count: 0, sessions: [] };

  const sessions = await EmployeeSession.find({
    restaurant: restaurantId,
    status: 'Active',
  });

  const logoutTime = new Date();
  const expired = [];

  for (const session of sessions) {
    const loginMs = session.loginTime
      ? new Date(session.loginTime).getTime()
      : logoutTime.getTime();
    session.logoutTime = logoutTime;
    session.duration = Math.max(0, Math.floor((logoutTime.getTime() - loginMs) / 1000));
    session.status = 'Expired';
    await session.save();
    await finalizeAttendanceOnClockOut({ session, logoutTime });
    expired.push(session);
  }

  return { count: expired.length, sessions: expired };
}

export async function expireSessionFromRefreshToken(refreshToken) {
  if (!refreshToken) return;
  try {
    const payload = decodeJwt(refreshToken);
    if (payload?.sessionId) {
      await markEmployeeSessionExpired(payload.sessionId);
    }
  } catch {
    // Ignore malformed tokens
  }
}

/**
 * Validates refresh token and issues a new access token for an active session.
 * Returns null on failure; callers handle HTTP responses and session expiry.
 */
export async function refreshEmployeeAccessToken(refreshToken) {
  if (!refreshToken) {
    return { ok: false, status: 401, message: 'Refresh token missing', expireSession: false };
  }

  const payload = await verifyToken(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    await expireSessionFromRefreshToken(refreshToken);
    return { ok: false, status: 401, message: 'Invalid or expired refresh token', expireSession: true };
  }

  const session = await EmployeeSession.findById(payload.sessionId);
  if (!session || session.status !== 'Active') {
    return { ok: false, status: 401, message: 'Session expired or terminated', expireSession: false };
  }

  const employee = await Employee.findById(payload.employeeId);
  if (!isEmployeeEligibleForSession(employee)) {
    await markEmployeeSessionExpired(session._id);
    return { ok: false, status: 403, message: 'Account suspended or inactive', expireSession: true };
  }

  const accessToken = await signToken(
    {
      employeeId: employee._id.toString(),
      restaurantId: employee.restaurant.toString(),
      sessionId: session._id.toString(),
      role: employee.role,
      type: 'access',
    },
    '1h'
  );

  return { ok: true, accessToken, session, employee };
}

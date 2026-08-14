const ACCESS_COOKIE = "employee_access_token";
const REFRESH_COOKIE = "employee_refresh_token";
const DEVICE_COOKIE = "device_token";

function isProd() {
  return process.env.NODE_ENV === "production";
}

/** Auth cookies used for new logins / refreshes. Lax + path=/ so POS APIs always receive them. */
export function employeeAuthCookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

function cookieHeader(name, { sameSite, secure, path = "/" }) {
  const sameSiteValue = sameSite === "strict" ? "Strict" : "Lax";
  const parts = [
    `${name}=`,
    `Path=${path}`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    `SameSite=${sameSiteValue}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Emit several Set-Cookie deletions so leftover production cookies still clear
 * even if they were written with a different SameSite / Secure combo.
 */
export function clearEmployeeAuthCookies(response) {
  const names = [ACCESS_COOKIE, REFRESH_COOKIE];
  const combos = [
    { sameSite: "lax", secure: isProd() },
    { sameSite: "strict", secure: isProd() },
    { sameSite: "lax", secure: true },
    { sameSite: "strict", secure: true },
  ];

  for (const name of names) {
    for (const combo of combos) {
      response.headers.append("Set-Cookie", cookieHeader(name, combo));
    }
  }

  return response;
}

export function setEmployeeAccessCookie(response, token) {
  response.cookies.set(ACCESS_COOKIE, token, employeeAuthCookieOptions(60 * 60));
}

export function setEmployeeRefreshCookie(response, token) {
  response.cookies.set(REFRESH_COOKIE, token, employeeAuthCookieOptions(60 * 60 * 24 * 7));
}

export function setDeviceTokenCookie(response, token) {
  response.cookies.set(DEVICE_COOKIE, token, employeeAuthCookieOptions(365 * 24 * 60 * 60));
}

export { ACCESS_COOKIE, REFRESH_COOKIE, DEVICE_COOKIE };

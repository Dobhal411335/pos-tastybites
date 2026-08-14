/**
 * Simple in-memory sliding-window rate limiter for sensitive endpoints.
 * Suitable for a single Node process (custom server.js). Not shared across
 * multiple instances — use Redis later if you scale horizontally.
 */

const buckets = new Map();

function pruneBucket(key, windowMs, now) {
  const arr = buckets.get(key);
  if (!arr) return [];
  const fresh = arr.filter((ts) => now - ts < windowMs);
  if (fresh.length === 0) buckets.delete(key);
  else buckets.set(key, fresh);
  return fresh;
}

/**
 * @param {object} opts
 * @param {string} opts.key - unique bucket key (e.g. ip + route)
 * @param {number} opts.limit - max attempts in window
 * @param {number} opts.windowMs - window length
 * @returns {{ ok: boolean, remaining: number, retryAfterSec: number }}
 */
export function checkRateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  const fresh = pruneBucket(key, windowMs, now);
  if (fresh.length >= limit) {
    const oldest = fresh[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return { ok: false, remaining: 0, retryAfterSec };
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return { ok: true, remaining: Math.max(0, limit - fresh.length), retryAfterSec: 0 };
}

export function clientIpFromRequest(request) {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export function rateLimitResponse(retryAfterSec, message = "Too many attempts. Please try again later.") {
  return Response.json(
    { success: false, message },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec || 60),
      },
    },
  );
}

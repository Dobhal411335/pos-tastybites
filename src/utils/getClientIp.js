/**
 * Extracts the client IP from the request headers
 * @param {Request} req - Next.js Request object
 * @returns {string} - The client IP
 */
export function getClientIp(req) {
  if (!req || !req.headers) return 'unknown';
  
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

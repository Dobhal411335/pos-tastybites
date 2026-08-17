/**
 * Extracts the user agent from the request headers
 * @param {Request} req - Next.js Request object
 * @returns {string} - The user agent
 */
export function getUserAgent(req) {
  if (!req || !req.headers) return 'unknown';
  return req.headers.get('user-agent') || 'unknown';
}

export function platformFromUserAgent(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua || ua === 'unknown') return 'unknown';
  if (ua.includes('android')) return 'Android';
  if (/iphone|ipad|ipod/.test(ua)) return 'iOS';
  if (ua.includes('windows')) return 'Windows';
  if (/mac os|macintosh/.test(ua)) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  return 'Unknown';
}

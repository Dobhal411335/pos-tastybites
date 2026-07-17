/**
 * Extracts the user agent from the request headers
 * @param {Request} req - Next.js Request object
 * @returns {string} - The user agent
 */
export function getUserAgent(req) {
  if (!req || !req.headers) return 'unknown';
  return req.headers.get('user-agent') || 'unknown';
}

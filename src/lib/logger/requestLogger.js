import logger from './logger';
import { getClientIp } from '../../utils/getClientIp';
import { getUserAgent } from '../../utils/getUserAgent';

/**
 * Logs the start of a request
 * @param {Request} req - Next.js Request object
 * @param {Object} [additionalInfo] - Extra context (e.g. userId, restaurantId)
 */
export function logRequestStart(req, additionalInfo = {}) {
  const reqId = req.headers.get('x-request-id') || 'unknown';
  const method = req.method;
  const url = req.url;
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);
  
  logger.info({
    type: 'request_start',
    reqId,
    method,
    url,
    ip,
    userAgent,
    ...additionalInfo
  }, `Request Started: ${method} ${url} | Request ID: ${reqId}`);
}

/**
 * Logs the end/response of a request
 * @param {Request} req - Next.js Request object
 * @param {Response} res - Next.js Response object
 * @param {number} startTime - Start time in ms (performance.now())
 */
export function logRequestEnd(req, res, startTime) {
  const reqId = req.headers.get('x-request-id') || 'unknown';
  const method = req.method;
  const url = req.url;
  const status = res.status;
  const duration = Math.round(performance.now() - startTime);
  const success = status >= 200 && status < 400;

  logger.info({
    type: 'request_end',
    reqId,
    method,
    url,
    status,
    durationMs: duration,
    success
  }, `Request Completed: ${method} ${url} | Status: ${status} | Duration: ${duration}ms`);
}

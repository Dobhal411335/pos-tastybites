import logger from './logger';

/**
 * Centralized error logger
 * @param {Error} error - The error object
 * @param {Request} [req] - Optional Next.js Request object for context
 * @param {Object} [context] - Additional context (userId, restaurantId, route)
 */
export function logError(error, req = null, context = {}) {
  const reqId = req ? (req.headers.get('x-request-id') || 'unknown') : 'unknown';
  
  const errorContext = {
    type: 'error',
    reqId,
    errorName: error.name || 'Error',
    message: error.message || 'Unknown error',
    stack: error.stack,
    ...context
  };

  logger.error(errorContext, `Error: ${error.name} - ${error.message} | Request ID: ${reqId}`);
  
  // Return a safe error object that doesn't leak stack traces
  return {
    message: 'An internal server error occurred',
    reqId
  };
}

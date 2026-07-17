import { NextResponse } from 'next/server';

/**
 * Middleware to generate and attach a Request ID
 * @param {Request} req
 */
export function withRequestId(req) {
  const reqId = req.headers.get('x-request-id') || crypto.randomUUID();
  
  // Clone request headers to mutate them
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', reqId);

  // Pass headers to the downstream request
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Attach to response headers
  response.headers.set('x-request-id', reqId);

  return response;
}

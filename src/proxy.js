import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-for-development-only'
);

export async function proxy(request) {
  // 1. Generate or read Request ID
  const reqId = request.headers.get('x-request-id') || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', reqId);

  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isAdminPage = pathname.startsWith('/admin');
  const isEmployeePage = pathname.startsWith('/employee');

  // Verify token
  let payload = null;
  if (token) {
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload;
    } catch (err) {
      // Invalid token
    }
  }

  let response;

  // Route protection
  if (!payload && (isAdminPage || isEmployeePage)) {
    response = NextResponse.redirect(new URL('/login', request.url));
  } else if (payload && isAuthPage) {
    // If logged in, redirect away from auth pages based on role
    if (payload.role === 'ADMIN') {
      response = NextResponse.redirect(new URL('/admin', request.url));
    } else {
      response = NextResponse.redirect(new URL('/employee', request.url));
    }
  } else if (payload && isAdminPage && payload.role !== 'ADMIN') {
    response = NextResponse.redirect(new URL('/unauthorized', request.url));
  } else {
    // Normal routing, inject request ID headers
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Set the Request ID on response headers
  response.headers.set('x-request-id', reqId);
  return response;
}

export const config = {
  // Match all request paths except for static assets to ensure Request ID is globally generated
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};


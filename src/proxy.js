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

  const isAdminPage = pathname.startsWith('/admin');
  const isAdminAuthPage = pathname === '/admin/login';
  const isEmployeePage = pathname.startsWith('/employee');
  const isEmployeeAuthPage = pathname === '/employee/login';

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
  if (!payload) {
    if (isAdminPage && !isAdminAuthPage) {
      response = NextResponse.redirect(new URL('/admin/login', request.url));
    } else if (isEmployeePage && !isEmployeeAuthPage) {
      response = NextResponse.redirect(new URL('/employee/login', request.url));
    } else {
      response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  } else {
    // Authenticated
    if (isAdminAuthPage || isEmployeeAuthPage) {
      if (payload.role === 'ADMIN') {
        response = NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        response = NextResponse.redirect(new URL('/employee', request.url));
      }
    } else if (isAdminPage && payload.role !== 'ADMIN') {
      response = NextResponse.redirect(new URL('/unauthorized', request.url));
    } else {
      response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
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


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

  const adminToken = request.cookies.get('token')?.value;
  const employeeToken = request.cookies.get('employee_access_token')?.value;
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith('/admin');
  const isEmployeePage = pathname.startsWith('/employee');
  const isAuthPage = pathname === '/login';

  let adminPayload = null;
  if (adminToken) {
    try {
      const verified = await jwtVerify(adminToken, JWT_SECRET);
      adminPayload = verified.payload;
    } catch (err) {}
  }

  let employeePayload = null;
  if (employeeToken) {
    try {
      const verified = await jwtVerify(employeeToken, JWT_SECRET);
      employeePayload = verified.payload;
    } catch (err) {}
  }

  let response;

  // Route protection
  if (isAdminPage) {
    if (!adminPayload) {
      response = NextResponse.redirect(new URL('/login', request.url));
    } else {
      response = NextResponse.next({ request: { headers: requestHeaders } });
    }
  } else if (isEmployeePage) {
    if (!employeePayload) {
      response = NextResponse.redirect(new URL('/login', request.url));
    } else {
      response = NextResponse.next({ request: { headers: requestHeaders } });
    }
  } else if (isAuthPage) {
    if (adminPayload) {
      response = NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (employeePayload) {
      response = NextResponse.redirect(new URL('/employee/orders/create', request.url));
    } else {
      response = NextResponse.next({ request: { headers: requestHeaders } });
    }
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
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


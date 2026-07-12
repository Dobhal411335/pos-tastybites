import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-for-development-only'
);

export async function proxy(request) {
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

  // Route protection
  if (!payload && (isAdminPage || isEmployeePage)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (payload && isAuthPage) {
    // If logged in, redirect away from auth pages based on role
    if (payload.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/employee', request.url));
  }

  // Role protection
  if (payload) {
    if (isAdminPage && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    // Employee cannot access admin routes (handled above)
    // Admin can access employee routes (implicitly allowed if we only restrict employee)
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/employee/:path*', '/login', '/register'],
};

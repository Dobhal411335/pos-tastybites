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
  const hostname = request.headers.get('host') || '';

  // Determine subdomains
  const isPos = hostname.includes('pos.tastybitesrestaurant.com') || hostname.includes('pos.localhost');
  const isSales = hostname.includes('sales.tastybitesrestaurant.com') || hostname.includes('sales.localhost');

  // We are renaming employee to sales
  const isAdminPage = pathname.startsWith('/admin');
  const isSalesPage = pathname.startsWith('/sales');
  const isAuthPage = pathname === '/login' || pathname === '/sales/login';

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

  let employeeRefreshValid = false;
  const employeeRefreshToken = request.cookies.get('employee_refresh_token')?.value;
  if (!employeePayload && employeeRefreshToken) {
    try {
      const verified = await jwtVerify(employeeRefreshToken, JWT_SECRET);
      employeeRefreshValid = verified.payload?.type === 'refresh';
    } catch (err) {}
  }

  let response;

  // Subdomain Routing (Rewrite logic)
  // If the user visits pos.tastybitesrestaurant.com/foo, we map it to /admin/foo
  // If the user visits sales.tastybitesrestaurant.com/foo, we map it to /sales/foo
  let targetPath = pathname;

  // Public/static assets must not be rewritten onto /sales or /admin
  // (e.g. /favicon/favicon.ico was becoming /sales/favicon/favicon.ico → 404)
  const isStaticAsset =
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/uploads') ||
    /\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot|txt|xml|webmanifest|json|map)$/i.test(pathname);
  
  // To avoid rewriting already prefixed paths (e.g., API routes or static files)
  if (
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !isStaticAsset
  ) {
    if (isSales && pathname === '/login') {
      targetPath = '/sales/login';
    } else if (isSales && pathname === '/') {
      // sales subdomain root → /floor (rewritten to /sales/floor below)
      response = NextResponse.redirect(new URL('/floor', request.url));
      response.headers.set('x-request-id', reqId);
      return response;
    } else if (pathname !== '/login' && isPos && !isAdminPage && !isSalesPage) {
      targetPath = `/admin${pathname === '/' ? '/dashboard' : pathname}`;
    } else if (pathname !== '/login' && isSales && !isSalesPage && !isAdminPage) {
      targetPath = `/sales${pathname}`;
    }
  }

  // Auth Protection Logic (applying on the resolved targetPath)
  const isTargetAdmin = targetPath.startsWith('/admin');
  const isTargetSales = targetPath.startsWith('/sales');

  if (isTargetAdmin) {
    if (!adminPayload) {
      response = NextResponse.redirect(new URL('/login', request.url));
    } else {
      // If we need to rewrite
      response = targetPath !== pathname 
        ? NextResponse.rewrite(new URL(targetPath, request.url), { request: { headers: requestHeaders } })
        : NextResponse.next({ request: { headers: requestHeaders } });
    }
  } else if (isTargetSales && targetPath !== '/sales/login') {
    if (!employeePayload && !adminPayload && !employeeRefreshValid) {
      response = NextResponse.redirect(new URL('/login', request.url));
    } else {
      response = targetPath !== pathname 
        ? NextResponse.rewrite(new URL(targetPath, request.url), { request: { headers: requestHeaders } })
        : NextResponse.next({ request: { headers: requestHeaders } });
    }
  } else if (isAuthPage || targetPath === '/sales/login') {
    // Only bounce away from login when the ACCESS token is still valid.
    // A leftover refresh cookie must not trap staff on /floor after the session dies.
    if (isSales && (adminPayload || employeePayload)) {
      response = NextResponse.redirect(new URL('/floor', request.url));
    } else if (isPos && adminPayload) {
      response = NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (adminPayload) {
      response = NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (employeePayload) {
      response = NextResponse.redirect(new URL('/sales/floor', request.url));
    } else {
      response = targetPath !== pathname
        ? NextResponse.rewrite(new URL(targetPath, request.url), { request: { headers: requestHeaders } })
        : NextResponse.next({ request: { headers: requestHeaders } });
    }
  } else {
    response = targetPath !== pathname 
      ? NextResponse.rewrite(new URL(targetPath, request.url), { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 2. Set the Request ID on response headers
  response.headers.set('x-request-id', reqId);
  return response;
}

export const config = {
  // Match all request paths except static assets (favicon folder, images, fonts, etc.)
  matcher: [
    '/((?!_next/static|_next/image|favicon(?:\\.ico|/)|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot|txt|xml|webmanifest)$).*)',
  ],
};


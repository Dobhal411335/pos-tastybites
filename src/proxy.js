import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || ''
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
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/sales/login' ||
    pathname === '/admin/login';

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
  // (e.g. /favicon.ico was becoming /sales/favicon.ico → 404)
  const isStaticAsset =
    pathname === '/favicon.ico' ||
    pathname.startsWith('/favicon-') ||
    pathname === '/apple-touch-icon.png' ||
    pathname.startsWith('/android-chrome-') ||
    pathname === '/site.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/uploads') ||
    pathname.endsWith('/manifest.webmanifest') ||
    /\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot|txt|xml|webmanifest|json|map)$/i.test(pathname);
  
  // To avoid rewriting already prefixed paths (e.g., API routes or static files)
  if (
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !isStaticAsset
  ) {
    // Canonical public URL is /floor (not /sales/floor)
    if (pathname === '/sales/floor') {
      const dest = new URL('/floor', request.url);
      dest.search = request.nextUrl.search;
      response = NextResponse.redirect(dest);
      response.headers.set('x-request-id', reqId);
      return response;
    }

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
    } else if (
      !isPos &&
      !isSales &&
      !isAdminPage &&
      !isSalesPage &&
      pathname === '/floor'
    ) {
      // Path-based host: /floor → /sales/floor (App Router folder; browser stays /floor)
      targetPath = '/sales/floor';
    }
  }

  // Auth Protection Logic (applying on the resolved targetPath)
  const isTargetAdmin = targetPath.startsWith('/admin');
  const isTargetSales = targetPath.startsWith('/sales');
  const isAdminLogin = targetPath === '/admin/login';
  const isSalesLogin = targetPath === '/sales/login';
  const isPwaPublic =
    isStaticAsset ||
    pathname === '/sw.js' ||
    pathname.endsWith('/manifest.webmanifest');

  if (isPwaPublic) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else if (isTargetAdmin && !isAdminLogin) {
    if (!adminPayload) {
      response = NextResponse.redirect(new URL('/admin/login', request.url));
    } else {
      // If we need to rewrite
      response = targetPath !== pathname 
        ? NextResponse.rewrite(new URL(targetPath, request.url), { request: { headers: requestHeaders } })
        : NextResponse.next({ request: { headers: requestHeaders } });
    }
  } else if (isTargetSales && !isSalesLogin) {
    if (!employeePayload && !adminPayload && !employeeRefreshValid) {
      // Path hosts → /sales/login; sales subdomain keeps /login (rewritten to /sales/login)
      const salesLoginPath = isSales ? '/login' : '/sales/login';
      response = NextResponse.redirect(new URL(salesLoginPath, request.url));
    } else {
      response = targetPath !== pathname 
        ? NextResponse.rewrite(new URL(targetPath, request.url), { request: { headers: requestHeaders } })
        : NextResponse.next({ request: { headers: requestHeaders } });
    }
  } else if (isAuthPage || isSalesLogin || isAdminLogin) {
    // Only bounce away from login when the ACCESS token is still valid.
    // A leftover refresh cookie must not trap staff on /floor after the session dies.
    if (isSales && (adminPayload || employeePayload)) {
      response = NextResponse.redirect(new URL('/floor', request.url));
    } else if (isPos && adminPayload) {
      response = NextResponse.redirect(new URL('/dashboard', request.url));
    } else if (adminPayload) {
      response = NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (employeePayload) {
      response = NextResponse.redirect(new URL('/floor', request.url));
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
  // Match all request paths except static assets (root favicon files, images, fonts, SW, manifests)
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|favicon-|apple-touch-icon\\.png|android-chrome-|site\\.webmanifest|sw\\.js|icons/|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot|txt|xml|webmanifest)$).*)',
  ],
};

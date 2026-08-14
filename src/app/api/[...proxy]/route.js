import { NextResponse } from 'next/server';

/**
 * Legacy open reverse-proxy. Disabled by default because it is an unauthenticated
 * SSRF / open-relay risk. Set ENABLE_LEGACY_API_PROXY=true only if still required,
 * and always require PROXY_SHARED_SECRET via header x-proxy-secret.
 */
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'http://localhost:5000/api';

function proxyDisabledResponse() {
  return NextResponse.json(
    { error: 'Proxy is disabled' },
    { status: 403 },
  );
}

function assertProxyAllowed(request) {
  if (process.env.ENABLE_LEGACY_API_PROXY !== 'true') {
    return proxyDisabledResponse();
  }
  const secret = process.env.PROXY_SHARED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Proxy is misconfigured' },
      { status: 503 },
    );
  }
  const provided = request.headers.get('x-proxy-secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(request, { params }) {
  return handleProxy(request, params);
}

export async function POST(request, { params }) {
  return handleProxy(request, params);
}

export async function PUT(request, { params }) {
  return handleProxy(request, params);
}

export async function DELETE(request, { params }) {
  return handleProxy(request, params);
}

export async function PATCH(request, { params }) {
  return handleProxy(request, params);
}

async function handleProxy(request, params) {
  const denied = assertProxyAllowed(request);
  if (denied) return denied;

  const proxyPath = (await params).proxy.join('/');
  // Block obvious SSRF path tricks
  if (proxyPath.includes('..') || proxyPath.startsWith('http')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const targetUrl = `${EXTERNAL_API_URL}/${proxyPath}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('x-proxy-secret');

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy Error' }, { status: 500 });
  }
}

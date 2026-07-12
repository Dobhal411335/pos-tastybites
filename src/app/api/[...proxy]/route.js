import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'http://localhost:5000/api';

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
  const proxyPath = (await params).proxy.join('/');
  const targetUrl = `${EXTERNAL_API_URL}/${proxyPath}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

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

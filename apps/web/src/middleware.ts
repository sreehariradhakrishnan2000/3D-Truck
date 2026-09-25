import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Cloudflare Edge Gateway & Proxy Middleware for CargoFlow
 *
 * Single Public Entry Point: https://3d-truck.sreehariradhakrishnan2000.workers.dev
 *
 * Routing:
 * - /_next/static/*  -> Intercept missing chunks, return text/plain 404 to avoid strict MIME type errors
 * - /api/*           -> Proxy REST API calls to the configured NestJS backend origin
 * - /socket.io/*     -> Proxy Socket.IO HTTP polling and WebSocket upgrades to NestJS
 * - /ws              -> Proxy WebSocket connections to NestJS WebSocket gateway (/ws namespace)
 * - All other routes -> Pass through to Next.js / OpenNext application
 */

function getBackendOrigin(): string {
  // 1. Cloudflare runtime context ALS
  try {
    const cfContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cfContext?.env?.BACKEND_API_ORIGIN) {
      return String(cfContext.env.BACKEND_API_ORIGIN).trim().replace(/\/+$/, '');
    }
  } catch {}

  // 2. Dynamic runtime process.env access (avoids build-time inlining)
  const envKey = 'BACKEND_API_ORIGIN';
  const dynamicOrigin = (process.env as any)[envKey] || (process.env as any)['INTERNAL_API_ORIGIN'] || (process.env as any)['API_URL'];
  if (dynamicOrigin && String(dynamicOrigin).trim()) {
    return String(dynamicOrigin).trim().replace(/\/+$/, '');
  }

  // 3. Fallback to active Quick Tunnel
  return 'https://brilliant-point-forecast-singer.trycloudflare.com';
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Static asset guard: Return text/plain 404 for missing chunks
  if (pathname.startsWith('/_next/static/')) {
    return new NextResponse('Asset Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  // 2. WebSocket Upgrade Proxy
  const isWsUpgrade = request.headers.get('upgrade')?.toLowerCase() === 'websocket';
  if (isWsUpgrade) {
    const backendOrigin = getBackendOrigin();
    if (!backendOrigin) {
      return new NextResponse('Backend WebSocket origin not configured', { status: 503 });
    }
    const targetUrl = new URL(`${pathname}${search}`, backendOrigin);
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set('host', targetUrl.host);
    forwardHeaders.set('x-forwarded-host', request.nextUrl.host);
    forwardHeaders.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));

    return fetch(targetUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
    });
  }

  // 3. HTTP Proxy for /api/*, /socket.io/*, and /ws
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/socket.io') ||
    pathname === '/ws' ||
    pathname.startsWith('/ws/')
  ) {
    const backendOrigin = getBackendOrigin();
    if (!backendOrigin) {
      return new NextResponse(
        JSON.stringify({
          statusCode: 503,
          code: 'BACKEND_NOT_CONFIGURED',
          message: 'Backend origin is not configured in Cloudflare Worker. Please configure BACKEND_API_ORIGIN.',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const targetUrl = new URL(`${pathname}${search}`, backendOrigin);

    const forwardHeaders = new Headers();
    request.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'host' && lower !== 'connection') {
        forwardHeaders.set(key, value);
      }
    });

    forwardHeaders.set('host', targetUrl.host);
    forwardHeaders.set('x-forwarded-host', request.nextUrl.host);
    forwardHeaders.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));

    const method = request.method;
    const hasBody = method !== 'GET' && method !== 'HEAD';

    const init: RequestInit = {
      method,
      headers: forwardHeaders,
      redirect: 'manual',
    };

    if (hasBody) {
      init.body = request.body;
      // @ts-expect-error duplex required for streaming body in fetch
      init.duplex = 'half';
    }

    try {
      const backendResponse = await fetch(targetUrl.toString(), init);

      const responseHeaders = new Headers();
      backendResponse.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower !== 'transfer-encoding' && lower !== 'connection') {
          responseHeaders.set(key, value);
        }
      });

      // Preserve Set-Cookie
      if (typeof (backendResponse.headers as any).getSetCookie === 'function') {
        const cookies = (backendResponse.headers as any).getSetCookie();
        if (cookies && cookies.length > 0) {
          responseHeaders.delete('set-cookie');
          for (const cookie of cookies) {
            responseHeaders.append('set-cookie', cookie);
          }
        }
      }

      if (!responseHeaders.has('Cache-Control')) {
        responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      }

      return new NextResponse(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
      });
    } catch (err: any) {
      return new NextResponse(
        JSON.stringify({
          statusCode: 502,
          code: 'BAD_GATEWAY',
          message: `Worker failed to reach backend at ${targetUrl.origin}: ${err?.message || 'Connection failed'}`,
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    }
  }

  // 4. Default: Continue to Next.js / OpenNext
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/_next/static/:path*',
    '/api/:path*',
    '/api',
    '/socket.io/:path*',
    '/socket.io',
    '/ws/:path*',
    '/ws',
  ],
};

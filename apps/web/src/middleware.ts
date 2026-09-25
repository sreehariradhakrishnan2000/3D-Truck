import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Cloudflare Edge Middleware for CargoFlow Web Frontend
 *
 * Catches any request for /_next/static/* that bypassed or missed Cloudflare Assets.
 * If an asset does not exist in .open-next/assets, Cloudflare falls through to the Worker.
 * We must NEVER return an HTML 404 document for a static JavaScript or CSS chunk,
 * as strict MIME checking (nosniff) causes the browser to reject it with an execution error.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: ['/_next/static/:path*'],
};

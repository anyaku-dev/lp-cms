import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const CMS_HOSTS = ['localhost', 'localhost:3000'];
const MAIN_DOMAIN = process.env.MAIN_DOMAIN || '';
if (MAIN_DOMAIN) CMS_HOSTS.push(MAIN_DOMAIN);

const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/api/seed', '/api/domain-lp'];

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads|lp-001|ogp.jpg).*)'],
};

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const pathname = req.nextUrl.pathname;
  const isCmsHost = CMS_HOSTS.some(h => host === h || host.endsWith('.vercel.app'));

  if (!isCmsHost) {
    if (pathname === '/' || pathname === '') {
      const url = req.nextUrl.clone();
      url.pathname = '/api/domain-lp';
      url.searchParams.set('host', host);
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  const isKnownAppPath = pathname === '/' || pathname.startsWith('/cms') || pathname.startsWith('/settings');
  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const isApiPath = pathname.startsWith('/api/');
  const isSlugPath = !isKnownAppPath && !isPublicPath && !isApiPath && pathname !== '/';

  if (isSlugPath) return NextResponse.next();

  const { user, supabaseResponse } = await updateSession(req);

  if (isPublicPath || isApiPath) return supabaseResponse;

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/cms';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

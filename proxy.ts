import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const CMS_HOSTS = ['localhost', 'localhost:3000'];
const MAIN_DOMAIN = process.env.MAIN_DOMAIN || '';
if (MAIN_DOMAIN) CMS_HOSTS.push(MAIN_DOMAIN);

const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/api/seed', '/api/domain-lp', '/api/stripe/webhook', '/forgot-password', '/reset-password'];

// CMSアプリ自体が持つパス一覧（これらにアクセスがあればCMSホストとして扱う）
const CMS_APP_PATHS = ['/login', '/signup', '/cms', '/settings', '/billing', '/auth', '/forgot-password', '/reset-password', '/api/'];

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads|lp-001|ogp.jpg).*)'],
};

export async function proxy(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const pathname = req.nextUrl.pathname;
  const isCmsHost = CMS_HOSTS.some(h => host === h || host.endsWith('.vercel.app'));

  if (!isCmsHost) {
    // ルートパス（/）の場合：CMSアプリ固有のパスへのアクセス実績（Cookie等）で判別
    // ただし / だけの場合はLP用ドメインか判定しづらいので、
    // まずLP検索を試み、見つからなければ /login へフォールバック
    if (pathname === '/' || pathname === '') {
      const url = req.nextUrl.clone();
      url.pathname = '/api/domain-lp';
      url.searchParams.set('host', host);
      url.searchParams.set('fallback', '/login');
      return NextResponse.rewrite(url);
    }

    // CMSアプリ固有パスへのアクセスなら、CMS扱いにしてそのまま処理を続行
    const isCmsAppPath = CMS_APP_PATHS.some(p => pathname.startsWith(p));
    if (isCmsAppPath) {
      // CMS側のルートとして扱う（下のCMSホスト処理へフォールスルー）
    } else {
      return NextResponse.next();
    }
  }

  const isKnownAppPath = pathname === '/' || pathname.startsWith('/cms') || pathname.startsWith('/settings') || pathname.startsWith('/billing');
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

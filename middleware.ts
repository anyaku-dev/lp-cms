import { NextRequest, NextResponse } from 'next/server';

// CMSの管理ドメイン（Vercelのデフォルトドメイン等）
const CMS_HOSTS = [
  'localhost',
  'localhost:3000',
];

// 環境変数でメインドメインを追加
const MAIN_DOMAIN = process.env.MAIN_DOMAIN || '';
if (MAIN_DOMAIN) CMS_HOSTS.push(MAIN_DOMAIN);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|uploads|lp-001).*)'],
};

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // CMSドメイン（メインドメイン or localhost）の場合 → 従来のBasic Auth + 通常ルーティング
  const isCmsHost = CMS_HOSTS.some(h => host === h || host.endsWith('.vercel.app'));
  
  if (isCmsHost) {
    // ルート（/）のみBasic Auth
    if (pathname === '/') {
      const basicAuth = req.headers.get('authorization');
      if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':');
        if (user === 'bakuurelp' && pwd === 'bakuurelp') {
          return NextResponse.next();
        }
      }
      return new NextResponse('Basic Auth Required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
      });
    }
    // その他のパス（/[slug]等）はそのまま通す
    return NextResponse.next();
  }

  // カスタムドメインの場合 → ドメインに紐づくLPを表示
  // ルートパス（/）でアクセスされた場合、内部的に /api/domain-lp?host=xxx にリライト
  if (pathname === '/' || pathname === '') {
    url.pathname = '/api/domain-lp';
    url.searchParams.set('host', host);
    return NextResponse.rewrite(url);
  }

  // カスタムドメインの/[slug]パスはそのまま通す（通常は使わないが安全策）
  return NextResponse.next();
}
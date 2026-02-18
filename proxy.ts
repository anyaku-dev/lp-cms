import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateSession } from './lib/supabase/middleware';

const CMS_HOSTS = ['localhost', 'localhost:3000'];
const MAIN_DOMAIN = process.env.MAIN_DOMAIN || '';
if (MAIN_DOMAIN) CMS_HOSTS.push(MAIN_DOMAIN);

const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/api/seed', '/api/domain-lp', '/api/stripe/webhook', '/forgot-password', '/reset-password'];

// CMSアプリ自体が持つパス一覧（これらにアクセスがあればCMSホストとして扱う）
const CMS_APP_PATHS = ['/login', '/signup', '/cms', '/settings', '/billing', '/auth', '/forgot-password', '/reset-password', '/api/'];

// Proxy内で直接Supabaseクエリ（Route Handlerではrewriteが使えないため）
async function findLpByDomain(domain: string): Promise<{ slug: string; id: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  const { data } = await supabase
    .from('lps')
    .select('id, slug, content')
    .filter('content->>customDomain', 'eq', domain)
    .neq('status', 'draft')
    .limit(1);
  if (!data?.length) return null;
  return { slug: data[0].slug || '', id: data[0].id };
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads|lp-001|ogp.jpg).*)'],
};

export async function proxy(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const pathname = req.nextUrl.pathname;
  const isCmsHost = CMS_HOSTS.some(h => host === h || host.endsWith('.vercel.app'));

  if (!isCmsHost) {
    // 独自ドメインのルートパス（/）→ ドメインに紐づくLPを直接検索
    if (pathname === '/' || pathname === '') {
      const domain = host.split(':')[0].toLowerCase();
      try {
        const lp = await findLpByDomain(domain);
        if (lp) {
          const targetSlug = lp.slug || `_domain_${lp.id}`;
          const url = req.nextUrl.clone();
          url.pathname = `/${targetSlug}`;
          return NextResponse.rewrite(url);
        }
      } catch (e: any) {
        console.error('[proxy] Domain LP lookup error:', e.message);
      }
      // LP見つからない → /login へリダイレクト
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
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

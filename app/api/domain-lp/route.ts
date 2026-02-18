import { NextRequest, NextResponse } from 'next/server';
import { getLpByDomain } from '../../cms/actions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const host = request.nextUrl.searchParams.get('host') || '';
  const fallback = request.nextUrl.searchParams.get('fallback') || '';
  
  // ドメイン名からポート番号を除去して正規化
  const domain = host.split(':')[0].toLowerCase();
  
  try {
    const lp = await getLpByDomain(domain);
    
    if (!lp) {
      // LPが見つからない場合、fallbackが指定されていればリダイレクト
      if (fallback) {
        const url = new URL(fallback, request.url);
        return NextResponse.redirect(url);
      }
      return new NextResponse('Not Found', { status: 404 });
    }

    // LP表示ページにリダイレクト（内部的にslugベースのパスへ）
    // slugが空の場合（独自ドメインルート公開）は、LP IDで内部アクセス
    const targetSlug = lp.slug || `_domain_${lp.id}`;
    const url = new URL(`/${targetSlug}`, request.url);
    return NextResponse.rewrite(url);
  } catch (e: any) {
    console.error('[domain-lp] Error:', e.message);
    // エラー時もfallbackがあればリダイレクト
    if (fallback) {
      const url = new URL(fallback, request.url);
      return NextResponse.redirect(url);
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

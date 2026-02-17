import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Bot判定（基本的なクローラーを除外）
const BOT_PATTERNS = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu|duckduck|facebookexternalhit|twitterbot|linkedinbot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|seznambot|ia_archiver|archive\.org/i;

function isBot(ua: string): boolean {
  return BOT_PATTERNS.test(ua);
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase環境変数が未設定です');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lpId, userId, sessionId, eventType, pageUrl, referrer, durationMs, buttonId } = body;

    // バリデーション
    if (!lpId || !sessionId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['pageview', 'click', 'leave'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // User-Agent取得 & ボット除外
    const userAgent = request.headers.get('user-agent') || '';
    if (isBot(userAgent)) {
      return NextResponse.json({ ok: true, filtered: true });
    }

    const admin = getAdminSupabase();

    const { error } = await admin.from('analytics_events').insert({
      lp_id: lpId,
      user_id: userId,
      session_id: sessionId,
      event_type: eventType,
      page_url: pageUrl || null,
      referrer: referrer || null,
      user_agent: userAgent,
      duration_ms: durationMs || null,
      button_id: buttonId || null,
    });

    if (error) {
      console.error('[analytics/track] Insert error:', error.message);
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[analytics/track] Error:', e.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

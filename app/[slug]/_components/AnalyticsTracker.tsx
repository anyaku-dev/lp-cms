'use client';

import { useEffect, useRef } from 'react';

type Props = {
  lpId: string;
  userId: string;
  slug: string;
};

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('_a_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('_a_sid', sid);
  }
  return sid;
}

function sendEvent(data: Record<string, any>) {
  // navigator.sendBeacon で確実に送信（ページ離脱時にも動作）
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const sent = navigator.sendBeacon('/api/analytics/track', blob);
  // sendBeacon が失敗した場合は fetch フォールバック
  if (!sent) {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {});
  }
}

export default function AnalyticsTracker({ lpId, userId, slug }: Props) {
  const startTime = useRef(Date.now());
  const hasSentPageview = useRef(false);
  const hasSentLeave = useRef(false);

  useEffect(() => {
    const sessionId = getSessionId();
    const basePayload = {
      lpId,
      userId,
      sessionId,
      pageUrl: window.location.href,
      referrer: document.referrer || '',
    };

    // --- 1. PV送信 ---
    if (!hasSentPageview.current) {
      hasSentPageview.current = true;
      sendEvent({ ...basePayload, eventType: 'pageview' });
    }

    // --- 2. 離脱時に滞在時間を送信 ---
    const sendLeave = () => {
      if (hasSentLeave.current) return;
      hasSentLeave.current = true;
      const durationMs = Date.now() - startTime.current;
      sendEvent({ ...basePayload, eventType: 'leave', durationMs });
    };

    // visibilitychange（タブ閉じ・切り替え時）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendLeave();
      }
    };

    // pagehide（iOS Safari対応）
    const handlePageHide = () => {
      sendLeave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    // --- 3. 外部リンク（buttonId付き）のクリック計測 ---
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // a タグか、その子要素から最も近い a タグを探す
      const anchor = target.closest('a[id]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const buttonId = anchor.id;
      if (!buttonId) return;

      // 同一オリジンは除外（内部リンク）
      try {
        const linkUrl = new URL(anchor.href, window.location.origin);
        if (linkUrl.origin === window.location.origin) return;
      } catch {
        return;
      }

      sendEvent({
        ...basePayload,
        eventType: 'click',
        buttonId,
      });
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('click', handleClick, true);
    };
  }, [lpId, userId, slug]);

  return null;
}

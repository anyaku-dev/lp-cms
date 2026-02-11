'use client';

import React, { useEffect, useState } from 'react';
import { getPlan, type PlanId } from '@/lib/plan';
import Link from 'next/link';

// ============================================================
// プラン別：解放された機能リスト
// ============================================================
const UNLOCK_FEATURES: Record<string, { icon: string; text: string }[]> = {
  personal: [
    { icon: '📄', text: 'LPを最大10個まで作成' },
    { icon: '🌐', text: '独自ドメインでの公開' },
    { icon: '💾', text: 'ストレージ容量 5GB' },
  ],
  business: [
    { icon: '📄', text: 'LP無制限で作成' },
    { icon: '🌐', text: '独自ドメインでの公開' },
    { icon: '💾', text: 'ストレージ容量 10GB' },
  ],
};

// ============================================================
// Billing 成功ページ（④ 課金成功後の「Welcome」演出）
// ============================================================
export default function BillingSuccessPage() {
  const [plan, setPlan] = useState<PlanId>('personal');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('plan');
    if (p === 'personal' || p === 'business') setPlan(p);
    const i = params.get('interval');
    if (i === 'monthly' || i === 'yearly') setBillingInterval(i);
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const config = getPlan(plan);
  const features = UNLOCK_FEATURES[plan] || UNLOCK_FEATURES.personal;
  const isBusiness = plan === 'business';

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", YuGothic, sans-serif',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f0f7ff 0%, #f5f5f7 50%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      WebkitFontSmoothing: 'antialiased' as any,
    }}>
      <style>{`
        @keyframes celebrateIn {
          from { opacity: 0; transform: scale(0.85) translateY(24px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes emojiPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes featureSlide {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes ctaFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        maxWidth: 520, width: '100%',
        background: '#fff', borderRadius: 24, padding: '48px 40px',
        boxShadow: '0 16px 64px rgba(0,113,227,0.08), 0 4px 16px rgba(0,0,0,0.04)',
        textAlign: 'center',
        animation: mounted ? 'celebrateIn 0.6s ease-out' : 'none',
        opacity: mounted ? 1 : 0,
      }}>
        {/* 🎉 アイコン */}
        <div style={{
          fontSize: 64, lineHeight: 1, marginBottom: 24,
          animation: mounted ? 'emojiPop 0.5s ease-out 0.3s both' : 'none',
        }}>
          🎉
        </div>

        {/* タイトル */}
        <h1 style={{
          fontSize: 28, fontWeight: 800, color: '#1d1d1f',
          margin: '0 0 12px', lineHeight: 1.3,
          letterSpacing: '-0.02em',
        }}>
          {config.name}プランへようこそ！
        </h1>

        {/* 本文 */}
        <p style={{
          fontSize: 15, color: '#6e6e73', lineHeight: 1.7,
          margin: '0 0 32px',
        }}>
          アップグレードが完了しました。<br />
          （{billingInterval === 'yearly' ? '年払い' : '月払い'}）<br />
          以下の機能が今すぐ使えるようになりました。
        </p>

        {/* 解放された機能リスト */}
        <div style={{
          background: '#f5f5f7', borderRadius: 16, padding: '24px 28px',
          textAlign: 'left', marginBottom: isBusiness ? 20 : 32,
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 0',
              borderBottom: i < features.length - 1 ? '1px solid #e5e5e5' : 'none',
              animation: mounted ? `featureSlide 0.4s ease-out ${0.5 + i * 0.1}s both` : 'none',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Business 追加文言 */}
        {isBusiness && (
          <p style={{
            fontSize: 13, color: '#6e6e73', lineHeight: 1.7,
            margin: '0 0 32px', background: '#f5f5f7',
            borderRadius: 10, padding: '14px 18px',
          }}>
            クライアントワークや複数案件の運用に最適な環境が整いました。
          </p>
        )}

        {/* 次の行動CTA */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          animation: mounted ? 'ctaFade 0.4s ease-out 0.8s both' : 'none',
        }}>
          <Link href="/cms" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '14px 24px', fontSize: 15, fontWeight: 700,
            background: 'linear-gradient(135deg, #0071e3, #0077ED)',
            color: '#fff', border: 'none', borderRadius: 12,
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(0,113,227,0.3)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>
            新しいLPを作成する
          </Link>
          <Link href="/cms" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px 24px', fontSize: 14, fontWeight: 600,
            background: '#f5f5f7', color: '#1d1d1f',
            border: 'none', borderRadius: 12,
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}>
            独自ドメインを設定する
          </Link>
          <Link href="/cms" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '10px 24px', fontSize: 13, fontWeight: 500,
            color: '#6e6e73', textDecoration: 'none',
          }}>
            ダッシュボードへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

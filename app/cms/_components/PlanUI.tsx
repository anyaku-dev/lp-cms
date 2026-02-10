'use client';

import React from 'react';
import { PLANS, getPlan, getNextPlan, formatBytes, type PlanId, type PlanConfig } from '@/lib/plan';

// ============================================================
// Stripe Checkout ヘルパー
// ============================================================

const PRICE_IDS: Partial<Record<PlanId, string>> = {
  personal: process.env.NEXT_PUBLIC_STRIPE_PERSONAL_PRICE_ID || '',
  business: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || '',
};

/** Stripe Checkout セッションを作成し遷移する */
export async function startCheckout(planId: PlanId): Promise<void> {
  const priceId = PRICE_IDS[planId];
  if (!priceId) {
    // サーバー側の環境変数を使用して checkout を作成
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed');
    if (data.url) window.location.href = data.url;
    return;
  }

  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Checkout failed');
  if (data.url) window.location.href = data.url;
}

/** Stripe Customer Portal セッションを作成し遷移する */
export async function openCustomerPortal(): Promise<void> {
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Portal failed');
  if (data.url) window.location.href = data.url;
}

// ============================================================
// アップグレードモーダル（共通）
// ============================================================

type UpgradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  targetPlan?: PlanConfig;
  onUpgrade?: () => void;
  upgradeLoading?: boolean;
  secondaryLabel?: string;
  secondaryAction?: () => void;
};

export function UpgradeModal({ isOpen, onClose, title, children, targetPlan, onUpgrade, upgradeLoading, secondaryLabel, secondaryAction }: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)', zIndex: 10000,
        animation: 'planFadeIn 0.2s ease-out',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: 20, padding: '36px 40px',
        maxWidth: 480, width: '90vw', zIndex: 10001,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        animation: 'planSlideUp 0.3s ease-out',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, background: 'none',
          border: 'none', fontSize: 20, cursor: 'pointer', color: '#999', lineHeight: 1,
        }}>✕</button>

        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1d1d1f', margin: '0 0 16px', lineHeight: 1.4 }}>
          {title}
        </h3>

        <div style={{ fontSize: 14, color: '#424245', lineHeight: 1.8, marginBottom: 28 }}>
          {children}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {targetPlan && (
            <button
              onClick={onUpgrade || (() => { window.location.href = '/settings#plan'; })}
              disabled={upgradeLoading}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '13px 24px', fontSize: 15, fontWeight: 700,
                background: upgradeLoading ? '#999' : 'linear-gradient(135deg, #0071e3, #0077ED)',
                color: '#fff', border: 'none', borderRadius: 12, cursor: upgradeLoading ? 'wait' : 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 4px 12px rgba(0,113,227,0.3)',
              }}
            >
              {upgradeLoading ? '処理中...' : `${targetPlan.name}にアップグレード`}
            </button>
          )}
          {secondaryLabel && secondaryAction ? (
            <button onClick={secondaryAction} style={{
              flex: targetPlan ? 'none' : 1,
              padding: '13px 24px', fontSize: 14, fontWeight: 600,
              background: '#f5f5f7', color: '#1d1d1f', border: 'none', borderRadius: 12,
              cursor: 'pointer', transition: 'background 0.15s',
            }}>
              {secondaryLabel}
            </button>
          ) : (
            <button onClick={onClose} style={{
              padding: '13px 24px', fontSize: 14, fontWeight: 600,
              background: '#f5f5f7', color: '#1d1d1f', border: 'none', borderRadius: 12,
              cursor: 'pointer',
            }}>
              キャンセル
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================
// LP作成制限モーダル
// ============================================================

type LpLimitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanId;
  currentCount: number;
  maxLps: number;
  onUpgrade?: () => void;
  upgradeLoading?: boolean;
};

export function LpLimitModal({ isOpen, onClose, currentPlan, currentCount, maxLps, onUpgrade, upgradeLoading }: LpLimitModalProps) {
  const plan = getPlan(currentPlan);
  const next = getNextPlan(currentPlan);

  return (
    <UpgradeModal
      isOpen={isOpen}
      onClose={onClose}
      title="作成できるLPの上限に達しました"
      targetPlan={next || undefined}
      onUpgrade={onUpgrade}
      upgradeLoading={upgradeLoading}
    >
      <p style={{ margin: '0 0 12px' }}>
        {plan.name}プランでは、作成できるLPは{maxLps}つまでです。
      </p>
      {next && (
        <p style={{ margin: '0 0 16px' }}>
          {next.name}プランにアップグレードすると、<br />
          最大{next.maxLps === 9999 ? '無制限' : `${next.maxLps}個`}までLPを作成できるようになります。<br />
          広告配信やABテストにも余裕をもって使えます。
        </p>
      )}
      {/* 簡易比較 */}
      {next && (
        <div style={{
          background: '#f5f5f7', borderRadius: 10, padding: '12px 16px',
          display: 'flex', gap: 20, fontSize: 13,
        }}>
          <div>
            <span style={{ color: '#6e6e73' }}>{plan.name}：</span>
            <span style={{ fontWeight: 700 }}>LP {maxLps}</span>
          </div>
          <div>
            <span style={{ color: '#0071e3' }}>{next.name}：</span>
            <span style={{ fontWeight: 700, color: '#0071e3' }}>LP {next.maxLps === 9999 ? '無制限' : next.maxLps}</span>
          </div>
        </div>
      )}
    </UpgradeModal>
  );
}

// ============================================================
// 独自ドメイン制限モーダル
// ============================================================

type DomainLimitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
  upgradeLoading?: boolean;
};

export function DomainLimitModal({ isOpen, onClose, onUpgrade, upgradeLoading }: DomainLimitModalProps) {
  return (
    <UpgradeModal
      isOpen={isOpen}
      onClose={onClose}
      title="独自ドメインは有料プランの機能です"
      targetPlan={PLANS.personal}
      onUpgrade={onUpgrade}
      upgradeLoading={upgradeLoading}
      secondaryLabel="閉じる"
      secondaryAction={onClose}
    >
      <p style={{ margin: '0 0 12px' }}>
        Personalプラン以上では、<br />独自ドメインを使ってLPを公開できます。
      </p>
      <p style={{ margin: '0 0 16px' }}>
        広告配信や本番運用では、<br />独自ドメインの利用がおすすめです。
      </p>
      {/* 解放される機能 */}
      <div style={{
        background: '#f0f7ff', borderRadius: 10, padding: '12px 16px',
        fontSize: 13, lineHeight: 1.8,
      }}>
        <div style={{ fontWeight: 700, color: '#1d1d1f', marginBottom: 4, fontSize: 12 }}>解放される機能</div>
        <div style={{ color: '#424245' }}>✓ 独自ドメインでの公開</div>
        <div style={{ color: '#424245' }}>✓ LPの信頼性向上</div>
      </div>
    </UpgradeModal>
  );
}

// ============================================================
// ストレージ制限モーダル
// ============================================================

type StorageLimitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanId;
  usedBytes: number;
  maxBytes: number;
  onUpgrade?: () => void;
  upgradeLoading?: boolean;
};

export function StorageLimitModal({ isOpen, onClose, currentPlan, usedBytes, maxBytes, onUpgrade, upgradeLoading }: StorageLimitModalProps) {
  const plan = getPlan(currentPlan);
  const next = getNextPlan(currentPlan);

  return (
    <UpgradeModal
      isOpen={isOpen}
      onClose={onClose}
      title="ストレージ容量の上限に達しました"
      targetPlan={next || undefined}
      onUpgrade={onUpgrade}
      upgradeLoading={upgradeLoading}
    >
      <p style={{ margin: '0 0 12px' }}>
        {plan.name}プランでは、利用できるストレージは{plan.storageLabel}までです。
      </p>
      {next && (
        <p style={{ margin: 0 }}>
          {next.name}プランにアップグレードすると、<br />
          {next.storageLabel}まで画像を保存できるようになります。
        </p>
      )}
    </UpgradeModal>
  );
}

// ============================================================
// ストレージ警告バナー
// ============================================================

type StorageWarningProps = {
  currentPlan: PlanId;
  usedBytes: number;
  maxBytes: number;
  onUpgrade?: () => void;
};

export function StorageWarningBanner({ currentPlan, usedBytes, maxBytes, onUpgrade }: StorageWarningProps) {
  const plan = getPlan(currentPlan);
  const next = getNextPlan(currentPlan);

  return (
    <div style={{
      background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 12,
      padding: '16px 20px', marginBottom: 16, fontSize: 13, lineHeight: 1.7,
    }}>
      <div style={{ fontWeight: 700, color: '#F57F17', marginBottom: 4, fontSize: 14 }}>
        ⚠ ストレージ容量が残り少なくなっています（{plan.storageLabel}中 {formatBytes(usedBytes)}）
      </div>
      <p style={{ margin: '0 0 8px', color: '#424245' }}>
        このまま利用を続けるには、
        {next ? `${next.name}プラン（${next.storageLabel}）へのアップグレードがおすすめです。` : '不要なファイルを削除してください。'}
      </p>
      {next && onUpgrade && (
        <button onClick={onUpgrade} style={{
          display: 'inline-block', padding: '6px 16px', fontSize: 12, fontWeight: 700,
          background: '#0071e3', color: '#fff', border: 'none', borderRadius: 8,
          cursor: 'pointer', transition: 'opacity 0.15s',
        }}>
          {next.name}にアップグレード
        </button>
      )}
    </div>
  );
}

// ============================================================
// 使用量バー（ダッシュボード常設）
// ============================================================

type UsageBarProps = {
  label: string;
  current: number;
  max: number;
  unit?: string;
  formatValue?: (v: number) => string;
};

export function UsageBar({ label, current, max, unit = '', formatValue }: UsageBarProps) {
  const ratio = Math.min(current / max, 1);
  const isWarning = ratio >= 0.8;
  const isFull = ratio >= 1;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: isFull ? '#d70015' : isWarning ? '#F57F17' : '#6e6e73' }}>
          {formatValue ? formatValue(current) : current}{unit} / {formatValue ? formatValue(max) : max}{unit}
        </span>
      </div>
      <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3, transition: 'width 0.6s ease-out',
          width: `${ratio * 100}%`,
          background: isFull ? '#d70015' : isWarning ? '#F57F17' : '#0071e3',
        }} />
      </div>
    </div>
  );
}

// ============================================================
// ダッシュボード用 プランバッジ（Free ユーザーのみ表示）
// ============================================================

type PlanUsageBadgeProps = {
  plan: PlanId;
  lpCount: number;
  storageUsedBytes: number;
};

export function PlanUsageBadge({ plan, lpCount, storageUsedBytes }: PlanUsageBadgeProps) {
  const config = getPlan(plan);

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12,
      padding: '16px 20px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <span style={{
            display: 'inline-block', padding: '3px 10px', fontSize: 11, fontWeight: 700,
            background: '#f5f5f7', color: '#1d1d1f', borderRadius: 6, letterSpacing: '0.03em',
          }}>
            {config.name}プラン
          </span>
        </div>
        {plan === 'free' && (
          <a href="/settings#plan" style={{
            fontSize: 12, fontWeight: 700, color: '#0071e3',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            アップグレード
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </a>
        )}
      </div>
      <UsageBar
        label="LP"
        current={lpCount}
        max={config.maxLps === 9999 ? lpCount : config.maxLps}
        unit={config.maxLps === 9999 ? ' (無制限)' : ''}
      />
      <UsageBar
        label="ストレージ"
        current={storageUsedBytes}
        max={config.maxStorageBytes}
        formatValue={formatBytes}
      />
    </div>
  );
}

// ============================================================
// プラン比較カード（設定ページ用）
// ============================================================

type PlanCardProps = {
  planConfig: PlanConfig;
  currentPlan: PlanId;
  isPopular?: boolean;
  onUpgrade?: (planId: PlanId) => void;
  onManage?: () => void;
  upgradeLoading?: PlanId | null;
};

export function PlanCard({ planConfig, currentPlan, isPopular, onUpgrade, onManage, upgradeLoading }: PlanCardProps) {
  const isCurrent = planConfig.id === currentPlan;
  const isLoading = upgradeLoading === planConfig.id;
  const isDowngrade = (
    (currentPlan === 'business' && planConfig.id !== 'business') ||
    (currentPlan === 'personal' && planConfig.id === 'free')
  );

  return (
    <div style={{
      flex: 1, minWidth: 220,
      background: isCurrent ? '#f0f7ff' : '#fff',
      border: isCurrent ? '2px solid #0071e3' : '1px solid #e5e5e5',
      borderRadius: 16, padding: '28px 24px',
      position: 'relative', display: 'flex', flexDirection: 'column',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      {isPopular && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #0071e3, #0077ED)', color: '#fff',
          fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20,
          letterSpacing: '0.05em',
        }}>
          おすすめ
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: '#1d1d1f' }}>
          {planConfig.name}
        </h4>
        <p style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#1d1d1f' }}>
          {planConfig.price === 0 ? '¥0' : `¥${planConfig.price.toLocaleString()}`}
          {planConfig.price > 0 && <span style={{ fontSize: 14, fontWeight: 500, color: '#6e6e73' }}> / 月</span>}
        </p>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
        {planConfig.features.map((f, i) => (
          <li key={i} style={{
            fontSize: 14, color: '#424245', padding: '6px 0', lineHeight: 1.5,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: '#0071e3', fontWeight: 700, fontSize: 14 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            padding: '12px 0', fontSize: 14, fontWeight: 700,
            color: '#0071e3', background: 'rgba(0,113,227,0.06)', borderRadius: 10,
            marginBottom: onManage && currentPlan !== 'free' ? 8 : 0,
          }}>
            現在のプラン
          </div>
          {onManage && currentPlan !== 'free' && (
            <button onClick={onManage} style={{
              fontSize: 12, color: '#6e6e73', background: 'none', border: 'none',
              cursor: 'pointer', textDecoration: 'underline', padding: '4px 0',
            }}>
              サブスクリプションを管理
            </button>
          )}
        </div>
      ) : isDowngrade ? (
        <div style={{
          padding: '12px 0', textAlign: 'center', fontSize: 13, fontWeight: 500,
          color: '#999', background: '#f9f9f9', borderRadius: 10,
        }}>
          ダウングレード
        </div>
      ) : (
        <button
          onClick={() => onUpgrade?.(planConfig.id)}
          disabled={isLoading || !!upgradeLoading}
          style={{
            padding: '12px 0', fontSize: 14, fontWeight: 700, width: '100%',
            background: isLoading ? '#999' : planConfig.id === 'personal' ? 'linear-gradient(135deg, #0071e3, #0077ED)' : '#1d1d1f',
            color: '#fff', border: 'none', borderRadius: 10,
            cursor: isLoading || upgradeLoading ? 'wait' : 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: planConfig.id === 'personal' ? '0 4px 12px rgba(0,113,227,0.3)' : 'none',
          }}
        >
          {isLoading ? '処理中...' : 'アップグレード'}
        </button>
      )}
    </div>
  );
}

// ============================================================
// CSS キーフレーム (モーダル用) — style タグで注入
// ============================================================

export function PlanModalStyles() {
  return (
    <style>{`
      @keyframes planFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes planSlideUp { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); } }
    `}</style>
  );
}

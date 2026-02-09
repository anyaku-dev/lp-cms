// ============================================================
// プラン定義・制限値・ヘルパー（共通モジュール）
// ============================================================

export type PlanId = 'free' | 'personal' | 'business';

export type PlanConfig = {
  id: PlanId;
  name: string;
  price: number;          // 月額（税込）
  priceLabel: string;     // 表示用
  maxLps: number;         // LP作成上限
  maxStorageBytes: number; // ストレージ上限 (bytes)
  storageLabel: string;   // 表示用
  customDomain: boolean;  // 独自ドメイン利用可否
  features: string[];     // プランカード用 feature list
};

// --- プラン定義（確定） ---
export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '¥0',
    maxLps: 2,
    maxStorageBytes: 512 * 1024 * 1024,        // 512MB
    storageLabel: '512MB',
    customDomain: false,
    features: [
      '作成できるLP：2',
      'ストレージ：512MB',
    ],
  },
  personal: {
    id: 'personal',
    name: 'Personal',
    price: 780,
    priceLabel: '¥780 / 月',
    maxLps: 10,
    maxStorageBytes: 5 * 1024 * 1024 * 1024,   // 5GB
    storageLabel: '5GB',
    customDomain: true,
    features: [
      '作成できるLP：10',
      '独自ドメイン：利用可能',
      'ストレージ：5GB',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 1980,
    priceLabel: '¥1,980 / 月',
    maxLps: 9999,  // 実装上の上限
    maxStorageBytes: 10 * 1024 * 1024 * 1024,  // 10GB
    storageLabel: '10GB',
    customDomain: true,
    features: [
      'LP無制限',
      '独自ドメイン利用可能',
      'ストレージ：10GB',
    ],
  },
};

// --- ヘルパー ---
export function getPlan(planId?: string): PlanConfig {
  if (planId && planId in PLANS) return PLANS[planId as PlanId];
  return PLANS.free;
}

/** ストレージ使用量をフォーマット (bytes → "123MB") */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
  }
  return Math.round(bytes / (1024 * 1024)) + 'MB';
}

/** ストレージ使用率 (0〜1) */
export function storageUsageRatio(usedBytes: number, plan: PlanConfig): number {
  return Math.min(usedBytes / plan.maxStorageBytes, 1);
}

/** ストレージ警告閾値 (80%) に達しているか */
export function isStorageWarning(usedBytes: number, plan: PlanConfig): boolean {
  return usedBytes / plan.maxStorageBytes >= 0.8;
}

/** ストレージ上限に達しているか */
export function isStorageFull(usedBytes: number, plan: PlanConfig): boolean {
  return usedBytes >= plan.maxStorageBytes;
}

/** LP作成上限に達しているか */
export function isLpLimitReached(currentCount: number, plan: PlanConfig): boolean {
  return currentCount >= plan.maxLps;
}

/** 次にアップグレードすべきプラン */
export function getNextPlan(currentPlan: PlanId): PlanConfig | null {
  if (currentPlan === 'free') return PLANS.personal;
  if (currentPlan === 'personal') return PLANS.business;
  return null;
}

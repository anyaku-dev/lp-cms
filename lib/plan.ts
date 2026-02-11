// ============================================================
// プラン定義・制限値・ヘルパー（共通モジュール）
// ============================================================

export type PlanId = 'free' | 'personal' | 'business';
export type BillingInterval = 'monthly' | 'yearly';

export type PlanConfig = {
  id: PlanId;
  name: string;
  price: number;            // 月額（税込）
  yearlyPrice: number;      // 年額（税込）
  priceLabel: string;       // 月額表示用
  yearlyPriceLabel: string; // 年額表示用
  yearlyDiscount: string;   // 年額割引率表示
  maxLps: number;           // LP作成上限
  maxStorageBytes: number;  // ストレージ上限 (bytes)
  storageLabel: string;     // 表示用
  customDomain: boolean;    // 独自ドメイン利用可否
  features: string[];       // プランカード用 feature list
};

// --- プラン定義（確定） ---
export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    yearlyPrice: 0,
    priceLabel: '¥0',
    yearlyPriceLabel: '¥0',
    yearlyDiscount: '',
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
    yearlyPrice: 7480,
    priceLabel: '¥780 / 月',
    yearlyPriceLabel: '¥7,480 / 年',
    yearlyDiscount: '20% OFF',
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
    yearlyPrice: 17800,
    priceLabel: '¥1,980 / 月',
    yearlyPriceLabel: '¥17,800 / 年',
    yearlyDiscount: '25% OFF',
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

// ============================================================
// 環境変数 → Price ID マッピング
// ============================================================

/** サーバーサイド用: 全Price IDマップ */
export function getPriceIdMap(): Record<string, string | undefined> {
  return {
    personal_monthly: process.env.STRIPE_PERSONAL_MONTHLY_PRICE_ID || process.env.STRIPE_PERSONAL_PRICE_ID,
    personal_yearly:  process.env.STRIPE_PERSONAL_YEARLY_PRICE_ID,
    business_monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || process.env.STRIPE_BUSINESS_PRICE_ID,
    business_yearly:  process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
  };
}

/** Price ID → { planId, interval } 逆引き */
export function resolvePriceId(priceId: string): { planId: PlanId; interval: BillingInterval } | null {
  const map = getPriceIdMap();
  for (const [key, val] of Object.entries(map)) {
    if (val && val === priceId) {
      const [planId, interval] = key.split('_') as [PlanId, BillingInterval];
      return { planId, interval };
    }
  }
  // フォールバック: 旧環境変数
  if (priceId === process.env.STRIPE_PERSONAL_PRICE_ID) return { planId: 'personal', interval: 'monthly' };
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return { planId: 'business', interval: 'monthly' };
  return null;
}

/** planId + interval → Price ID */
export function getStripePriceId(planId: PlanId, interval: BillingInterval): string | undefined {
  const map = getPriceIdMap();
  return map[`${planId}_${interval}`];
}

// ============================================================
// 価格比較ロジック（アップグレード / ダウングレード判定）
// ============================================================

/** 月額換算コストで比較（年額は月割りで計算） */
export function getEffectiveMonthlyPrice(planId: PlanId, interval: BillingInterval): number {
  const plan = PLANS[planId];
  if (!plan) return 0;
  if (interval === 'yearly') return plan.yearlyPrice / 12;
  return plan.price;
}

/** ターゲットが現在より上位か判定 */
export function isUpgrade(
  currentPlan: PlanId, currentInterval: BillingInterval,
  targetPlan: PlanId, targetInterval: BillingInterval
): boolean {
  const currentPrice = getEffectiveMonthlyPrice(currentPlan, currentInterval);
  const targetPrice = getEffectiveMonthlyPrice(targetPlan, targetInterval);
  return targetPrice > currentPrice;
}

// ============================================================
// ヘルパー
// ============================================================

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

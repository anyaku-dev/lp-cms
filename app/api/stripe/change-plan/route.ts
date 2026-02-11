import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  getStripePriceId, resolvePriceId, isUpgrade, getPlan,
  type PlanId, type BillingInterval,
} from '@/lib/plan';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ============================================================
// POST /api/stripe/change-plan
// アップグレード（即時・按分）・ダウングレード（次回更新）
// ============================================================
export async function POST(request: NextRequest) {
  try {
    // ─── 認証 ───
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetPlanId, targetInterval } = await request.json() as {
      targetPlanId: PlanId;
      targetInterval: BillingInterval;
    };

    if (!targetPlanId || !targetInterval) {
      return NextResponse.json({ error: 'targetPlanId and targetInterval are required' }, { status: 400 });
    }

    // ─── 現在のサブスクリプション情報を取得 ───
    const admin = getAdminSupabase();
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('plan, stripe_subscription_id, stripe_subscription_item_id, billing_interval, current_price_id')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const currentPlan = (profile.plan || 'free') as PlanId;
    const currentInterval = (profile.billing_interval || 'monthly') as BillingInterval;

    // Free → 有料はチェックアウト経由 (このAPIではなく /api/stripe/checkout)
    if (currentPlan === 'free') {
      return NextResponse.json({ error: 'Free plan users should use checkout' }, { status: 400 });
    }

    // サブスクリプションが無い場合
    if (!profile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // ─── 新しい Price ID を解決 ───
    const newPriceId = getStripePriceId(targetPlanId, targetInterval);
    if (!newPriceId) {
      return NextResponse.json({ error: 'Target price not configured' }, { status: 400 });
    }

    // 同じプラン・同じ interval は変更不要
    if (currentPlan === targetPlanId && currentInterval === targetInterval) {
      return NextResponse.json({ error: 'Already on this plan' }, { status: 400 });
    }

    // ─── Stripe サブスクリプションを取得 ───
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const itemId = profile.stripe_subscription_item_id || subscription.items.data[0]?.id;
    if (!itemId) {
      return NextResponse.json({ error: 'Subscription item not found' }, { status: 500 });
    }

    // ─── アップグレード vs ダウングレード判定 ───
    const upgrading = isUpgrade(currentPlan, currentInterval, targetPlanId, targetInterval);

    if (upgrading) {
      // ━━━ アップグレード：即時適用 + 按分 ━━━
      const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
        items: [{ id: itemId, price: newPriceId }],
        proration_behavior: 'create_prorations',
        // cancel_at_period_end があれば解除
        cancel_at_period_end: false,
      });

      const newItem = updated.items.data[0];
      const resolved = resolvePriceId(newItem.price.id);
      // Stripe SDK v20 では current_period_end が型定義にないが API は返す
      const periodEnd = (updated as any).current_period_end as number | undefined;

      // DB を即時更新
      await admin.from('profiles').update({
        plan: resolved?.planId || targetPlanId,
        billing_interval: resolved?.interval || targetInterval,
        current_price_id: newItem.price.id,
        stripe_subscription_item_id: newItem.id,
        ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
      }).eq('id', user.id);

      return NextResponse.json({
        success: true,
        type: 'upgrade',
        plan: resolved?.planId || targetPlanId,
        interval: resolved?.interval || targetInterval,
      });

    } else {
      // ━━━ ダウングレード：条件チェック → 次回更新時に適用 ━━━

      // (1) 使用状況チェック
      const targetPlanConfig = getPlan(targetPlanId);
      const [{ count: lpCount }, { data: storageData }] = await Promise.all([
        admin.from('lps').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        admin.from('assets').select('file_size').eq('user_id', user.id),
      ]);

      const currentLpCount = lpCount || 0;
      const currentStorage = (storageData || []).reduce((sum: number, a: any) => sum + (a.file_size || 0), 0);

      const violations: string[] = [];

      if (currentLpCount > targetPlanConfig.maxLps) {
        violations.push(`LP数が${targetPlanConfig.name}プランの上限（${targetPlanConfig.maxLps === 9999 ? '無制限' : targetPlanConfig.maxLps}個）を超えています（現在${currentLpCount}個）`);
      }

      if (currentStorage > targetPlanConfig.maxStorageBytes) {
        const { formatBytes } = await import('@/lib/plan');
        violations.push(`ストレージ使用量が${targetPlanConfig.name}プランの上限（${targetPlanConfig.storageLabel}）を超えています（現在${formatBytes(currentStorage)}）`);
      }

      // ドメインチェック: Personal→Free へのダウングレード時
      if (!targetPlanConfig.customDomain) {
        const { count: domainCount } = await admin
          .from('lps')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .not('custom_domain', 'is', null);
        if ((domainCount || 0) > 0) {
          violations.push('独自ドメインを使用中のLPがあります。Freeプランでは独自ドメインを利用できません');
        }
      }

      if (violations.length > 0) {
        return NextResponse.json({
          error: 'downgrade_blocked',
          violations,
        }, { status: 422 });
      }

      // (2) Stripe でスケジュール変更（次回更新時に price 切替）
      const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
        items: [{ id: itemId, price: newPriceId }],
        proration_behavior: 'none',
      });

      const newItem = updated.items.data[0];
      const resolved = resolvePriceId(newItem.price.id);
      const periodEnd2 = (updated as any).current_period_end as number | undefined;

      // DB更新 — plan は次回更新時に Webhook で変更される想定だが、
      // Stripe は proration_behavior: 'none' でも即座に price を変更するため
      // DB もあわせて更新する
      await admin.from('profiles').update({
        plan: resolved?.planId || targetPlanId,
        billing_interval: resolved?.interval || targetInterval,
        current_price_id: newItem.price.id,
        stripe_subscription_item_id: newItem.id,
        ...(periodEnd2 ? { current_period_end: new Date(periodEnd2 * 1000).toISOString() } : {}),
      }).eq('id', user.id);

      return NextResponse.json({
        success: true,
        type: 'downgrade',
        plan: resolved?.planId || targetPlanId,
        interval: resolved?.interval || targetInterval,
        effectiveDate: periodEnd2 ? new Date(periodEnd2 * 1000).toISOString() : undefined,
      });
    }

  } catch (error: any) {
    console.error('[stripe/change-plan] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

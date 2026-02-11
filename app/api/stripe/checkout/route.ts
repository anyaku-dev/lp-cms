import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getStripePriceId, resolvePriceId, type PlanId, type BillingInterval } from '@/lib/plan';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { priceId: rawPriceId, planId, interval = 'monthly' } = await request.json() as {
      priceId?: string;
      planId?: PlanId;
      interval?: BillingInterval;
    };

    // planId + interval から priceId を解決
    let priceId = rawPriceId;
    if (!priceId && planId) {
      priceId = getStripePriceId(planId, interval);
    }
    if (!priceId) return NextResponse.json({ error: 'priceId or planId is required' }, { status: 400 });

    // success_url 用に planId を解決
    let resolvedPlanId = planId;
    if (!resolvedPlanId) {
      const resolved = resolvePriceId(priceId);
      if (resolved) resolvedPlanId = resolved.planId;
    }

    // 既存の Stripe Customer を検索、なければ新規作成
    const adminSupabase = (await import('@supabase/supabase-js')).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, username')
      .eq('id', user.id)
      .single();

    // 既にアクティブなサブスクリプションがある場合はブロック（二重作成防止）
    if (profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Already has an active subscription. Use change-plan instead.' },
        { status: 400 }
      );
    }

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Stripe に新規 Customer を作成
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id, username: profile?.username || '' },
      });
      customerId = customer.id;

      // profiles に保存
      await adminSupabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?plan=${resolvedPlanId || 'personal'}&interval=${interval}`,
      cancel_url: `${appUrl}/settings#plan`,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[stripe/checkout] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

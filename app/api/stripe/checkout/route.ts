import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { priceId: rawPriceId, planId } = await request.json();

    // planId が渡された場合は環境変数から priceId を解決
    let priceId = rawPriceId;
    if (!priceId && planId) {
      const priceMap: Record<string, string | undefined> = {
        personal: process.env.STRIPE_PERSONAL_PRICE_ID,
        business: process.env.STRIPE_BUSINESS_PRICE_ID,
      };
      priceId = priceMap[planId];
    }
    if (!priceId) return NextResponse.json({ error: 'priceId or planId is required' }, { status: 400 });

    // 既存の Stripe Customer を検索、なければ新規作成
    const adminSupabase = (await import('@supabase/supabase-js')).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('stripe_customer_id, username')
      .eq('id', user.id)
      .single();

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
      success_url: `${appUrl}/settings?upgrade=success`,
      cancel_url: `${appUrl}/settings?upgrade=cancel`,
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

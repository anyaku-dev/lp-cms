import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { resolvePriceId } from '@/lib/plan';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPlanFromPriceId(priceId: string): { plan: string; interval: string } {
  const resolved = resolvePriceId(priceId);
  if (resolved) return { plan: resolved.planId, interval: resolved.interval };
  // フォールバック
  if (priceId === process.env.STRIPE_PERSONAL_PRICE_ID) return { plan: 'personal', interval: 'monthly' };
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return { plan: 'business', interval: 'monthly' };
  return { plan: 'free', interval: 'monthly' };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('[stripe/webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const admin = getAdminSupabase();

  try {
    switch (event.type) {
      // ─── 新規サブスクリプション完了 ───
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.user_id;
        if (!userId || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const item = subscription.items.data[0];
        const priceId = item?.price.id;
        const { plan, interval } = getPlanFromPriceId(priceId);
        const periodEnd = (subscription as any).current_period_end as number | undefined;

        console.log(`[stripe/webhook] checkout.session.completed: user=${userId} plan=${plan} interval=${interval}`);

        await admin.from('profiles').update({
          plan,
          billing_interval: interval,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          stripe_subscription_item_id: item?.id || null,
          current_price_id: priceId || null,
          cancel_at_period_end: false,
          payment_failed_at: null,
          ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
        }).eq('id', userId);

        break;
      }

      // ─── プラン変更（アップグレード/ダウングレード） ───
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const item = subscription.items.data[0];
        const priceId = item?.price.id;
        const { plan, interval } = getPlanFromPriceId(priceId);
        const periodEnd = (subscription as any).current_period_end as number | undefined;

        console.log(`[stripe/webhook] subscription.updated: sub=${subscription.id} plan=${plan} interval=${interval} status=${subscription.status}`);

        // アクティブなサブスクリプションのみ更新
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          await admin.from('profiles').update({
            plan,
            billing_interval: interval,
            stripe_subscription_item_id: item?.id || null,
            current_price_id: priceId || null,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            payment_failed_at: null,
            ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
          }).eq('stripe_subscription_id', subscription.id);
        }

        break;
      }

      // ─── サブスクリプション解約 ───
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        console.log(`[stripe/webhook] subscription.deleted: sub=${subscription.id}`);

        // プランを free に戻す
        await admin.from('profiles').update({
          plan: 'free',
          billing_interval: 'monthly',
          stripe_subscription_id: null,
          stripe_subscription_item_id: null,
          current_price_id: null,
          current_period_end: null,
          cancel_at_period_end: false,
        }).eq('stripe_subscription_id', subscription.id);

        break;
      }

      // ─── 決済失敗 ───
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const failedCustomerId = invoice.customer as string;
        console.warn(`[stripe/webhook] payment_failed: customer=${failedCustomerId}`);
        // DB に決済失敗を記録
        await admin.from('profiles').update({
          payment_failed_at: new Date().toISOString(),
        }).eq('stripe_customer_id', failedCustomerId);
        break;
      }

      default:
        console.log(`[stripe/webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error: any) {
    console.error(`[stripe/webhook] Error processing ${event.type}:`, error.message);
    // Stripe に 200 を返さないと再送され続けるので、処理エラーでも 200 を返す
  }

  return NextResponse.json({ received: true });
}

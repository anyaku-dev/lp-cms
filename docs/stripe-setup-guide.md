# Stripe 導入ガイド（爆速画像LPコーディングPRO）

## 概要

現在の実装では、`profiles.plan` カラムで `'free' | 'personal' | 'business'` を管理しています。  
Stripe を導入すると、**Webhook 経由で `plan` が自動更新される**仕組みになります。

---

## 1. Stripe ダッシュボードでの設定

### 1-1. 商品（Product）の作成

Stripe ダッシュボード → [Products](https://dashboard.stripe.com/products) で以下を作成します。

| 商品名 | 価格 | 請求間隔 | Price ID（メモ） |
|--------|------|----------|-------------------|
| Personal プラン | ¥780 | 月次 | `price_xxx_personal` |
| Business プラン | ¥1,980 | 月次 | `price_xxx_business` |

> 各 Price の `metadata` に `plan_id: personal` / `plan_id: business` を設定しておくと、Webhook 側で判別しやすくなります。

### 1-2. Webhook の設定

Stripe ダッシュボード → [Webhooks](https://dashboard.stripe.com/webhooks) で以下を設定します。

- **Endpoint URL**: `https://your-domain.com/api/stripe/webhook`
- **Listen するイベント**:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

> Webhook Secret（`whsec_xxx`）を控えておいてください。

---

## 2. 環境変数

`.env.local` に以下を追加します。

```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PERSONAL_PRICE_ID=price_xxx_personal
STRIPE_BUSINESS_PRICE_ID=price_xxx_business
```

> テスト環境では `sk_test_xxx` / `pk_test_xxx` を使用してください。

---

## 3. 必要な npm パッケージ

```bash
npm install stripe
```

---

## 4. 実装が必要な API ルート

### 4-1. Checkout セッション作成 (`/api/stripe/checkout`)

ユーザーがアップグレードボタンを押したときに、Stripe Checkout セッションを作成します。

```typescript
// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { priceId } = await request.json();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgrade=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgrade=cancel`,
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
```

### 4-2. Webhook ハンドラ (`/api/stripe/webhook`)

Stripe からのイベントを受け取り、`profiles.plan` を更新します。

```typescript
// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const admin = getAdminSupabase();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.user_id;
      if (!userId) break;

      // サブスクリプションから price → plan_id を取得
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0]?.price.id;
      const plan = getPlanFromPriceId(priceId);

      await admin.from('profiles').update({
        plan,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      }).eq('id', userId);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = getPlanFromPriceId(priceId);

      // stripe_subscription_id で該当ユーザーを検索
      await admin.from('profiles').update({ plan })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      // プランを free に戻す
      await admin.from('profiles').update({ plan: 'free' })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function getPlanFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PERSONAL_PRICE_ID) return 'personal';
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return 'business';
  return 'free';
}
```

---

## 5. DB マイグレーション（Stripe 連携用カラム追加）

Stripe 導入時に以下の SQL を Supabase SQL Editor で実行してください。

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles (stripe_subscription_id);
```

---

## 6. フロントエンド側の変更

### 6-1. アップグレードボタンの接続

現在 `/settings#plan` のアップグレードボタンは静的ですが、Stripe 導入後は以下のように接続します。

```typescript
const handleUpgrade = async (priceId: string) => {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  });
  const { url } = await res.json();
  window.location.href = url;  // Stripe Checkout に遷移
};
```

### 6-2. PlanCard の onClick を追加

`PlanUI.tsx` の `PlanCard` コンポーネントのアップグレードボタンに `onClick` を追加して、上記 `handleUpgrade` を呼び出します。

---

## 7. テスト手順

1. Stripe ダッシュボードをテストモードにする
2. テスト用カード番号 `4242 4242 4242 4242` でCheckoutを完了
3. Webhook でイベントが届き、`profiles.plan` が更新されることを確認
4. LP作成制限・ストレージ制限が新プランに基づいて緩和されることを確認

### Stripe CLI でのローカルテスト

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

---

## 8. 本番デプロイ時のチェックリスト

- [ ] Stripe ダッシュボードをライブモードに切替
- [ ] 環境変数にライブキーを設定
- [ ] Webhook endpoint をライブ URL に設定
- [ ] DB マイグレーション実行済み
- [ ] テスト決済で plan が正しく更新されることを確認
- [ ] プランダウングレード（subscription deleted）で free に戻ることを確認

---

## 現在の実装状態

| 機能 | 状態 |
|------|------|
| プラン定義 (`lib/plan.ts`) | ✅ 完了 |
| DB `profiles.plan` カラム | ✅ 完了（migration-003） |
| サーバー側制限チェック | ✅ 完了 |
| LP作成制限モーダル | ✅ 完了 |
| ストレージ制限モーダル | ✅ 完了 |
| 独自ドメイン制限モーダル | ✅ 完了 |
| ダッシュボード使用状況表示 | ✅ 完了 |
| 設定ページ プラン管理 | ✅ 完了 |
| Stripe Checkout 連携 | 🔜 次ステップ |
| Stripe Webhook 連携 | 🔜 次ステップ |

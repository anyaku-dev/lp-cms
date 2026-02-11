-- ============================================================
-- サブスクリプション管理用カラム追加
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT,
  ADD COLUMN IF NOT EXISTS current_price_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- billing_interval は 'monthly' | 'yearly' のいずれか
ALTER TABLE profiles
  ADD CONSTRAINT chk_billing_interval
  CHECK (billing_interval IN ('monthly', 'yearly'));

COMMENT ON COLUMN profiles.stripe_subscription_item_id IS 'Stripe Subscription Item ID (si_xxx) - プラン変更時に必要';
COMMENT ON COLUMN profiles.current_price_id IS 'Stripe Price ID (price_xxx) - 現在適用中の価格';
COMMENT ON COLUMN profiles.billing_interval IS '課金間隔: monthly / yearly';
COMMENT ON COLUMN profiles.current_period_end IS '現在の課金期間の終了日時';

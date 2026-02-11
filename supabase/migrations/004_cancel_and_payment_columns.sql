-- 004: キャンセル予約・決済失敗カラム追加
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ DEFAULT NULL;

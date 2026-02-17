-- ============================================================
-- アクセス解析テーブル
-- Supabase SQL Editorで実行してください
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lp_id UUID NOT NULL REFERENCES lps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('pageview', 'click', 'leave')),
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  duration_ms INTEGER,
  button_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- パフォーマンス用インデックス
CREATE INDEX idx_analytics_lp_id ON analytics_events(lp_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_lp_event_date ON analytics_events(lp_id, event_type, created_at);

-- RLS無効化（サーバーサイドのservice_roleキーでのみアクセスするため）
ALTER TABLE analytics_events DISABLE ROW LEVEL SECURITY;

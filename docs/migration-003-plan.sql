-- ============================================================
-- Migration 003: Plan column + storage tracking
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. profiles に plan カラムを追加
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

-- CHECK制約（free / personal / business のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plan_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
      CHECK (plan IN ('free', 'personal', 'business'));
  END IF;
END$$;

-- 2. assets テーブルの file_size が bigint であることを確認
-- (既存テーブルが integer の場合に ALTER)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'file_size'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE assets ALTER COLUMN file_size TYPE BIGINT;
  END IF;
END$$;

-- 3. ストレージ使用量を高速に取得するためのインデックス
CREATE INDEX IF NOT EXISTS idx_assets_user_id_file_size
  ON assets (user_id, file_size);

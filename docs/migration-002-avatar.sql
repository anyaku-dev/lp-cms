-- ============================================================
-- migration-002: profiles に avatar_url カラムを追加
-- ============================================================

-- avatar_url（R2上の画像URL）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- ============================================================
-- 爆速画像LPコーディングPRO - DB マイグレーション
-- Supabase Auth + ユーザー分離テーブル + RLS
-- ============================================================

-- 既存テーブルを削除（完全リセット）
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS domains CASCADE;
DROP TABLE IF EXISTS lps CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS kv_store CASCADE;

-- ============================================================
-- 1) profiles（ユーザープロフィール）
-- ============================================================
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT NOT NULL UNIQUE,
  email      TEXT NOT NULL,
  org_type   TEXT DEFAULT 'individual',  -- 'corporation' | 'individual'
  team_size  TEXT DEFAULT '1',
  industry   TEXT DEFAULT '',
  plan       TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- username ルックアップ用（サービスロール不要で重複チェック）
CREATE POLICY "profiles_select_username" ON profiles FOR SELECT USING (true);

-- ============================================================
-- 2) user_settings（ユーザーごとのグローバル設定）
-- ============================================================
CREATE TABLE user_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_gtm             TEXT DEFAULT '',
  default_pixel           TEXT DEFAULT '',
  default_head_code       TEXT DEFAULT '',
  default_meta_description TEXT DEFAULT '',
  default_favicon         TEXT DEFAULT '',
  default_ogp_image       TEXT DEFAULT '',
  auto_webp               BOOLEAN DEFAULT true,
  webp_quality            INT DEFAULT 75,
  animation_enabled       BOOLEAN DEFAULT true,
  animation_duration      NUMERIC(4,2) DEFAULT 0.6,
  animation_delay         NUMERIC(4,2) DEFAULT 0.1,
  pc_width_percent        INT DEFAULT 30,
  pc_background_image     TEXT DEFAULT '',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_settings_select" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_settings_delete" ON user_settings FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3) lps（LP本体）
-- ============================================================
CREATE TABLE lps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug       TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '新規LPプロジェクト',
  content    JSONB NOT NULL DEFAULT '{}'::jsonb,   -- 全LP設定をJSONBで保持
  status     TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

ALTER TABLE lps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lps_select_own" ON lps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lps_insert_own" ON lps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lps_update_own" ON lps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lps_delete_own" ON lps FOR DELETE USING (auth.uid() = user_id);

-- 公開LP表示用（slug検索でRLSバイパスが必要→service_roleで取得する）
-- ※ 公開LP閲覧は service_role 経由 or 別ポリシー

-- ============================================================
-- 4) domains（独自ドメイン設定）
-- ============================================================
CREATE TABLE domains (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain     TEXT NOT NULL,
  note       TEXT DEFAULT '',
  status     TEXT DEFAULT 'pending',  -- 'pending' | 'verified' | 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain)
);

ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "domains_select_own" ON domains FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "domains_insert_own" ON domains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "domains_update_own" ON domains FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "domains_delete_own" ON domains FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5) assets（画像・ファイル管理）
-- ============================================================
CREATE TABLE assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lp_id       UUID REFERENCES lps(id) ON DELETE SET NULL,
  object_key  TEXT NOT NULL,
  url         TEXT NOT NULL,
  mime_type   TEXT DEFAULT '',
  file_size   BIGINT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_select_own" ON assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "assets_insert_own" ON assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assets_delete_own" ON assets FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- プロフィール自動作成トリガーは不要（アプリ側で3/4画面で作成）
-- ============================================================

-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER lps_updated_at BEFORE UPDATE ON lps FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER domains_updated_at BEFORE UPDATE ON domains FOR EACH ROW EXECUTE FUNCTION update_updated_at();

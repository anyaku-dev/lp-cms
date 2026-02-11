'use server';

import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// --- Admin Supabase ---
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase環境変数が未設定です');
  return createClient(url, key);
}

// --- R2 ---
function getR2() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}
function getR2Bucket() { return process.env.R2_BUCKET_NAME || ''; }
function getR2PublicUrl() { return process.env.R2_PUBLIC_URL || ''; }

// --- 認証ヘルパー ---
async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインが必要です');
  return user;
}

// --- 型定義 ---
export type FullProfile = {
  id: string;
  username: string;
  email: string;
  org_type: string;
  team_size: string;
  industry: string;
  plan: string;
  avatar_url: string | null;
  created_at: string;
  billing_interval: string;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
};

// ============================================================
// セクションA：プロフィール取得 / 更新
// ============================================================

export async function getProfile(): Promise<FullProfile | null> {
  const user = await requireUser();
  const admin = getAdminSupabase();
  const { data, error } = await admin.from('profiles').select('*').eq('id', user.id).single();
  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    org_type: data.org_type || 'individual',
    team_size: data.team_size || '1',
    industry: data.industry || '',
    plan: data.plan || 'free',
    avatar_url: data.avatar_url || null,
    created_at: data.created_at,
    billing_interval: data.billing_interval || 'monthly',
    current_period_end: data.current_period_end || null,
    stripe_subscription_id: data.stripe_subscription_id || null,
  };
}

export async function checkUsernameAvailable(username: string, currentUserId: string): Promise<boolean> {
  const admin = getAdminSupabase();
  const { data } = await admin.from('profiles').select('id').eq('username', username).neq('id', currentUserId);
  return !data || data.length === 0;
}

export async function updateProfile(updates: {
  username?: string;
  org_type?: string;
  team_size?: string;
  industry?: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  const admin = getAdminSupabase();

  // usernameバリデーション
  if (updates.username !== undefined) {
    const u = updates.username.trim();
    if (u.length < 3 || u.length > 20) {
      return { success: false, error: 'ユーザー名は3〜20文字で入力してください' };
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(u)) {
      return { success: false, error: 'ユーザー名は英数字・_・-のみ使用できます' };
    }
    const available = await checkUsernameAvailable(u, user.id);
    if (!available) {
      return { success: false, error: 'このユーザー名は既に使用されています' };
    }
    updates.username = u;
  }

  const { error } = await admin.from('profiles').update(updates).eq('id', user.id);
  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'このユーザー名は既に使用されています' };
    }
    return { success: false, error: 'プロフィールの更新に失敗しました: ' + error.message };
  }

  return { success: true };
}

// ============================================================
// セクションB：アバター管理
// ============================================================

export async function uploadAvatar(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  const user = await requireUser();
  const admin = getAdminSupabase();

  // プロフィール取得（username必要）
  const { data: profile } = await admin.from('profiles').select('username, avatar_url').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'プロフィールが見つかりません' };

  const file = formData.get('file') as File | null;
  if (!file) return { success: false, error: 'ファイルが選択されていません' };

  // バリデーション
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: '対応形式: JPG, PNG, WebP のみです' };
  }
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return { success: false, error: 'ファイルサイズは5MB以下にしてください' };
  }

  const r2 = getR2();
  const bucket = getR2Bucket();
  const username = profile.username;
  const ext = file.name.split('.').pop() || 'jpg';
  const objectKey = `${username}/profile/${crypto.randomUUID()}.${ext}`;

  // R2アップロード
  const arrayBuffer = await file.arrayBuffer();
  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: Buffer.from(arrayBuffer),
    ContentType: file.type,
  }));

  const publicUrl = `${getR2PublicUrl()}/${objectKey}`;

  // 旧アバターがあればR2から削除
  if (profile.avatar_url) {
    const oldKey = profile.avatar_url.replace(`${getR2PublicUrl()}/`, '');
    if (oldKey) {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: oldKey }));
      } catch { /* 旧ファイル削除失敗は無視 */ }
    }
    // 旧assetレコードも削除
    await admin.from('assets').delete().eq('user_id', user.id).eq('url', profile.avatar_url);
  }

  // assetsにINSERT
  await admin.from('assets').insert({
    user_id: user.id,
    object_key: objectKey,
    url: publicUrl,
    mime_type: file.type,
    file_size: file.size,
  });

  // profilesのavatar_urlを更新
  await admin.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

  return { success: true, url: publicUrl };
}

export async function deleteAvatar(): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  const admin = getAdminSupabase();

  const { data: profile } = await admin.from('profiles').select('avatar_url').eq('id', user.id).single();
  if (!profile?.avatar_url) return { success: true };

  const r2 = getR2();
  const bucket = getR2Bucket();
  const objectKey = profile.avatar_url.replace(`${getR2PublicUrl()}/`, '');

  // R2から削除
  if (objectKey) {
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    } catch { /* 削除失敗は無視 */ }
  }

  // assetレコード削除
  await admin.from('assets').delete().eq('user_id', user.id).eq('url', profile.avatar_url);

  // profilesのavatar_urlをnullへ
  await admin.from('profiles').update({ avatar_url: null }).eq('id', user.id);

  return { success: true };
}



'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

// --- DB設定 (Supabase service_role — サーバーのみ) ---
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase環境変数が未設定です');
  return createClient(url, key);
}

// --- Storage設定 (Cloudflare R2) ---
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

// --- 認証ヘルパー（Server Action 用） ---
async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインが必要です');
  return user;
}

async function getUserProfile(userId: string) {
  const admin = getAdminSupabase();
  const { data } = await admin.from('profiles').select('username').eq('id', userId).single();
  return data;
}

// --- 型定義 ---

export type LinkArea = {
  left: number;
  top: number;
  width: number;
  height: number;
  href: string;
  ariaLabel: string;
};

export type ImageData = {
  type?: 'image' | 'html' | 'youtube';
  src: string;
  alt: string;
  customId?: string;
  links?: LinkArea[];
  htmlContent?: string;
  youtubeUrl?: string;
  youtubePaddingX?: number;
  youtubePaddingY?: number;
  youtubeBgColor?: string;
  overlapBelow?: number;
  fileSize?: number;
};

export type MenuItem = {
  label: string;
  href: string;
};

export type HeaderConfig = {
  type: 'timer' | 'menu' | 'none';
  timerPeriodDays: number;
  logoSrc?: string;
  menuItems: MenuItem[];
};

export type FooterCtaConfig = {
  enabled: boolean;
  imageSrc: string;
  href: string;
  widthPercent: number;
  bottomMargin: number;
  showAfterPx: number;
  hideBeforeBottomPx: number;
};

export type TrackingConfig = {
  gtm?: string;
  meta?: string;
  pixel?: string;
  useDefault: boolean;
};

export type CustomDomain = {
  domain: string;
  note?: string;
};

export type GlobalSettings = {
  defaultGtm: string;
  defaultPixel: string;
  defaultHeadCode: string;
  defaultMetaDescription: string;
  defaultFavicon: string;
  defaultOgpImage: string;
  autoWebp: boolean;
  webpQuality: number;
  animationEnabled: boolean;
  animationDuration: number;
  animationDelay: number;
  pcWidthPercent: number;
  pcBackgroundImage: string;
  domains: CustomDomain[];
};

export type SideImageSettings = {
  src: string;
  widthPercent: number;
  verticalAlign: 'top' | 'center';
};

export type SideImagesConfig = {
  left: SideImageSettings;
  right: SideImageSettings;
};

export type LpData = {
  id: string;
  slug: string;
  title: string;
  pageTitle?: string;
  status: 'draft' | 'public' | 'private';
  password?: string;
  images: ImageData[];
  header: HeaderConfig;
  footerCta: FooterCtaConfig;
  tracking: TrackingConfig;
  customHeadCode?: string;
  customMetaDescription?: string;
  customFavicon?: string;
  customOgpImage?: string;
  customCss?: string;
  customDomain?: string;
  pcBackgroundImage?: string;
  sideImages?: SideImagesConfig;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  id: string;
  username: string;
  email: string;
};

// --- ユーザー情報取得 ---

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) return null;
    return { id: profile.id, username: profile.username, email: profile.email };
  } catch {
    return null;
  }
}

// --- 全体設定（ユーザー単位） ---

function settingsToGlobal(s: any): GlobalSettings {
  return {
    defaultGtm: s?.default_gtm ?? '',
    defaultPixel: s?.default_pixel ?? '',
    defaultHeadCode: s?.default_head_code ?? '',
    defaultMetaDescription: s?.default_meta_description ?? '',
    defaultFavicon: s?.default_favicon ?? '',
    defaultOgpImage: s?.default_ogp_image ?? '',
    autoWebp: s?.auto_webp ?? true,
    webpQuality: s?.webp_quality ?? 75,
    animationEnabled: s?.animation_enabled ?? true,
    animationDuration: s?.animation_duration ?? 0.6,
    animationDelay: s?.animation_delay ?? 0.1,
    pcWidthPercent: s?.pc_width_percent ?? 30,
    pcBackgroundImage: s?.pc_background_image ?? '',
    domains: [],  // domainsは別テーブル
  };
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const user = await requireUser();
  const admin = getAdminSupabase();

  const [{ data: settings }, { data: domains }] = await Promise.all([
    admin.from('user_settings').select('*').eq('user_id', user.id).single(),
    admin.from('domains').select('*').eq('user_id', user.id).order('created_at'),
  ]);

  const gs = settingsToGlobal(settings);
  gs.domains = (domains || []).map((d: any) => ({ domain: d.domain, note: d.note || '' }));
  return gs;
}

export async function saveGlobalSettings(settings: GlobalSettings) {
  const user = await requireUser();
  const admin = getAdminSupabase();

  const { error } = await admin.from('user_settings').upsert({
    user_id: user.id,
    default_gtm: settings.defaultGtm,
    default_pixel: settings.defaultPixel,
    default_head_code: settings.defaultHeadCode,
    default_meta_description: settings.defaultMetaDescription,
    default_favicon: settings.defaultFavicon,
    default_ogp_image: settings.defaultOgpImage,
    auto_webp: settings.autoWebp,
    webp_quality: settings.webpQuality,
    animation_enabled: settings.animationEnabled,
    animation_duration: settings.animationDuration,
    animation_delay: settings.animationDelay,
    pc_width_percent: settings.pcWidthPercent,
    pc_background_image: settings.pcBackgroundImage,
  }, { onConflict: 'user_id' });

  if (error) throw new Error('設定の保存に失敗: ' + error.message);
  revalidatePath('/');
  return { success: true };
}

// --- LP管理（ユーザー単位） ---

function rowToLp(row: any): LpData {
  const c = row.content || {};
  return {
    id: row.id,
    slug: row.slug,
    title: row.title || c.title || '新規LPプロジェクト',
    pageTitle: c.pageTitle ?? '',
    status: row.status || 'draft',
    password: c.password,
    images: c.images || [],
    header: c.header || { type: 'none', timerPeriodDays: 3, logoSrc: '', menuItems: [] },
    footerCta: c.footerCta || { enabled: false, imageSrc: '', href: '', widthPercent: 90, bottomMargin: 20, showAfterPx: 0, hideBeforeBottomPx: 0 },
    tracking: c.tracking || { gtm: '', pixel: '', meta: '', useDefault: true },
    customHeadCode: c.customHeadCode ?? '',
    customMetaDescription: c.customMetaDescription ?? '',
    customFavicon: c.customFavicon ?? '',
    customOgpImage: c.customOgpImage ?? '',
    customCss: c.customCss ?? '',
    customDomain: c.customDomain ?? '',
    pcBackgroundImage: c.pcBackgroundImage ?? '',
    sideImages: c.sideImages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function lpToRow(lp: LpData, userId: string) {
  const { id, slug, title, status, createdAt, updatedAt, ...content } = lp;
  return {
    id,
    user_id: userId,
    slug,
    title,
    status,
    content,
  };
}

export async function getLps(): Promise<LpData[]> {
  const user = await requireUser();
  const admin = getAdminSupabase();
  const { data, error } = await admin.from('lps').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) { console.error('[getLps]', error); return []; }
  return (data || []).map(rowToLp);
}

export async function saveLp(lp: LpData) {
  const user = await requireUser();
  const admin = getAdminSupabase();

  // slug重複チェック（同一ユーザー内）
  const { data: existing } = await admin.from('lps').select('id').eq('user_id', user.id).eq('slug', lp.slug).neq('id', lp.id);
  if (existing && existing.length > 0) throw new Error('このスラッグは既に使用されています。');

  const row = lpToRow(lp, user.id);

  // 存在チェック
  const { data: existingLp } = await admin.from('lps').select('id').eq('id', lp.id).eq('user_id', user.id).single();

  if (existingLp) {
    const { error } = await admin.from('lps').update({
      slug: row.slug,
      title: row.title,
      status: row.status,
      content: row.content,
    }).eq('id', lp.id).eq('user_id', user.id);
    if (error) throw new Error('LPの保存に失敗: ' + error.message);
  } else {
    const { error } = await admin.from('lps').insert(row);
    if (error) throw new Error('LPの作成に失敗: ' + error.message);
  }

  revalidatePath('/');
  revalidatePath('/' + lp.slug);
  return { success: true };
}

export async function deleteLp(id: string) {
  const user = await requireUser();
  const admin = getAdminSupabase();
  const { error } = await admin.from('lps').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error('削除に失敗: ' + error.message);
  revalidatePath('/');
  return { success: true };
}

export async function duplicateLp(sourceId: string) {
  const user = await requireUser();
  const admin = getAdminSupabase();

  const { data: source } = await admin.from('lps').select('*').eq('id', sourceId).eq('user_id', user.id).single();
  if (!source) throw new Error('コピー元のLPが見つかりません');

  const srcLp = rowToLp(source);
  const now = new Date().toISOString();

  const newLp: LpData = {
    ...srcLp,
    id: crypto.randomUUID(),
    title: srcLp.title + 'のコピー',
    slug: srcLp.slug + '-copy-' + Date.now().toString(36),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-7),
  };

  const row = lpToRow(newLp, user.id);
  const { error } = await admin.from('lps').insert(row);
  if (error) throw new Error('複製に失敗: ' + error.message);

  revalidatePath('/');
  return { success: true };
}

export async function generateRandomPassword() {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-7);
}

// --- 公開LP取得（slug指定、認証不要 → service_role使用） ---

export async function getPublicLpBySlug(slug: string, preview = false) {
  const admin = getAdminSupabase();
  const { data, error } = await admin.from('lps').select('*, profiles!inner(username)').eq('slug', slug);
  if (error || !data?.length) return { lp: undefined, globalSettings: undefined };

  const row = data[0];
  const lp = rowToLp(row);
  if (!preview && lp.status === 'draft') return { lp: undefined, globalSettings: undefined };

  // このLPのユーザーのグローバル設定を取得
  const { data: settings } = await admin.from('user_settings').select('*').eq('user_id', row.user_id).single();
  const gs = settingsToGlobal(settings);

  return { lp, globalSettings: gs };
}

export async function getLpByDomain(domain: string) {
  const admin = getAdminSupabase();
  // content JSONBのcustomDomainフィールドを検索
  const { data } = await admin.from('lps').select('*').filter('content->>customDomain', 'eq', domain).neq('status', 'draft');
  if (!data?.length) return undefined;
  return rowToLp(data[0]);
}

// --- 画像ライブラリ（ユーザーのR2アセット一覧） ---

export async function getBlobList(): Promise<string[]> {
  const user = await requireUser();
  const profile = await getUserProfile(user.id);
  if (!profile) return [];

  const prefix = profile.username + '/';
  const result = await getR2().send(new ListObjectsV2Command({
    Bucket: getR2Bucket(),
    Prefix: prefix,
    MaxKeys: 100,
  }));

  return (result.Contents || [])
    .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
    .map(obj => `${getR2PublicUrl()}/${obj.Key}`);
}

// --- ドメイン管理 ---

export async function addDomain(domain: string, note: string = '') {
  const user = await requireUser();
  const admin = getAdminSupabase();

  const { error } = await admin.from('domains').insert({
    user_id: user.id,
    domain: domain.toLowerCase().trim(),
    note,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') throw new Error('このドメインは既に登録されています');
    throw new Error('ドメインの追加に失敗: ' + error.message);
  }

  return { success: true };
}

export async function removeDomain(domain: string) {
  const user = await requireUser();
  const admin = getAdminSupabase();

  const { error } = await admin.from('domains').delete().eq('user_id', user.id).eq('domain', domain);
  if (error) throw new Error('ドメインの削除に失敗: ' + error.message);

  return { success: true };
}

export async function getDomains(): Promise<CustomDomain[]> {
  const user = await requireUser();
  const admin = getAdminSupabase();
  const { data } = await admin.from('domains').select('*').eq('user_id', user.id).order('created_at');
  return (data || []).map((d: any) => ({ domain: d.domain, note: d.note || '' }));
}

// --- Vercel Domains API ---
function getVercelConfig() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) return null;
  return { token, projectId, teamId };
}

export async function addVercelDomain(domain: string): Promise<{ success: boolean; error?: string }> {
  const config = getVercelConfig();
  if (!config) return { success: false, error: 'Vercel API未設定' };

  const url = `https://api.vercel.com/v10/projects/${config.projectId}/domains${config.teamId ? `?teamId=${config.teamId}` : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: domain }),
  });

  if (res.ok) return { success: true };
  const data = await res.json().catch(() => ({}));
  if (data?.error?.code === 'domain_already_in_use' || data?.error?.code === 'domain_already_exists') return { success: true };
  return { success: false, error: data?.error?.message || `Vercel API error (${res.status})` };
}

export async function removeVercelDomain(domain: string): Promise<{ success: boolean; error?: string }> {
  const config = getVercelConfig();
  if (!config) return { success: false, error: 'Vercel API未設定' };

  const url = `https://api.vercel.com/v9/projects/${config.projectId}/domains/${domain}${config.teamId ? `?teamId=${config.teamId}` : ''}`;
  const res = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${config.token}` } });
  if (res.ok || res.status === 404) return { success: true };
  const data = await res.json().catch(() => ({}));
  return { success: false, error: data?.error?.message || `Vercel API error (${res.status})` };
}

export async function getVercelDomainStatus(domain: string): Promise<{ configured: boolean; verified: boolean; error?: string }> {
  const config = getVercelConfig();
  if (!config) return { configured: false, verified: false, error: 'Vercel API未設定' };

  const url = `https://api.vercel.com/v9/projects/${config.projectId}/domains/${domain}${config.teamId ? `?teamId=${config.teamId}` : ''}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${config.token}` } });
  if (!res.ok) return { configured: false, verified: false };
  const data = await res.json();
  return { configured: true, verified: data.verified === true };
}

export async function isVercelApiConfigured(): Promise<boolean> {
  return !!(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);
}

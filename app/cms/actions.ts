'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// --- DB設定 (Supabase) ---
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Storage設定 (Cloudflare R2) ---
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const R2_BUCKET = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// --- KV風ヘルパー (Supabase PostgreSQL) ---
async function kvGet<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('kv_store')
    .select('value')
    .eq('key', key)
    .single();
  if (error) {
    console.error(`[kvGet] key="${key}" error:`, error.message);
    return null;
  }
  if (!data) return null;
  return data.value as T;
}

async function kvSet(key: string, value: any): Promise<void> {
  const { error } = await supabase
    .from('kv_store')
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  if (error) {
    console.error(`[kvSet] key="${key}" error:`, error.message);
    throw new Error(`データの保存に失敗しました: ${error.message}`);
  }
}

const KEY_LPS = 'lps_data';
const KEY_SETTINGS = 'global_settings';

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
  src: string;
  alt: string;
  customId?: string;
  links?: LinkArea[];
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
  pcMaxWidth: number;
  pcBackgroundImage: string;
};

// ★更新: サイド画像の個別設定用型定義
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
  pcBackgroundImage?: string;
  sideImages?: SideImagesConfig; // 構造を変更
  createdAt: string;
  updatedAt: string;
};

// --- 全体設定 ---

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const settings = await kvGet<GlobalSettings>(KEY_SETTINGS);
  
  return {
    defaultGtm: '',
    defaultPixel: '',
    defaultHeadCode: '',
    defaultMetaDescription: '',
    defaultFavicon: '',
    defaultOgpImage: '',
    autoWebp: false,
    webpQuality: 75,
    animationEnabled: true,
    animationDuration: 0.6,
    animationDelay: 0.1,
    pcMaxWidth: 480,
    pcBackgroundImage: '',
    ...(settings || {})
  };
}

export async function saveGlobalSettings(settings: GlobalSettings) {
  await kvSet(KEY_SETTINGS, settings);
  revalidatePath('/');
  return { success: true };
}

// --- LP管理 ---

export async function getLps() {
  const lps = await kvGet<any[]>(KEY_LPS) || [];
  
  return lps.map(lp => {
    // 既存のnormalizeロジック等はpage.tsx側でも厳密に行うが、ここでも最低限の型合わせを行う
    return lp as LpData;
  });
}

export async function saveLp(lp: LpData) {
  const lps = await getLps();
  const index = lps.findIndex((item) => item.id === lp.id);
  
  const slugExists = lps.some(item => item.slug === lp.slug && item.id !== lp.id);
  if (slugExists) {
    throw new Error('このスラッグは既に使用されています。');
  }

  const now = new Date().toISOString();

  // データのサニタイズと正規化
  const safeLp: LpData = {
    ...lp,
    header: {
      type: lp.header?.type || 'none',
      timerPeriodDays: lp.header?.timerPeriodDays ?? 3,
      logoSrc: lp.header?.logoSrc || '',
      menuItems: lp.header?.menuItems || []
    },
    footerCta: {
      enabled: lp.footerCta?.enabled ?? false,
      imageSrc: lp.footerCta?.imageSrc || '',
      href: lp.footerCta?.href || '',
      widthPercent: lp.footerCta?.widthPercent ?? 90,
      bottomMargin: lp.footerCta?.bottomMargin ?? 20,
      showAfterPx: lp.footerCta?.showAfterPx ?? 0,
      hideBeforeBottomPx: lp.footerCta?.hideBeforeBottomPx ?? 0
    },
    // ★更新: サイド画像設定の保存
    sideImages: {
      left: {
        src: lp.sideImages?.left?.src || '',
        widthPercent: lp.sideImages?.left?.widthPercent ?? 15,
        verticalAlign: lp.sideImages?.left?.verticalAlign || 'top'
      },
      right: {
        src: lp.sideImages?.right?.src || '',
        widthPercent: lp.sideImages?.right?.widthPercent ?? 15,
        verticalAlign: lp.sideImages?.right?.verticalAlign || 'top'
      }
    },
    pcBackgroundImage: lp.pcBackgroundImage || '',
    customCss: lp.customCss || ''
  };

  if (index >= 0) {
    lps[index] = { 
      ...safeLp, 
      createdAt: lps[index].createdAt || now,
      updatedAt: now 
    };
  } else {
    lps.push({ 
      ...safeLp, 
      createdAt: now, 
      updatedAt: now 
    });
  }

  await kvSet(KEY_LPS, lps);
  revalidatePath('/');
  revalidatePath(`/${lp.slug}`);
  return { success: true };
}

export async function deleteLp(id: string) {
  const lps = await getLps();
  const newLps = lps.filter(item => item.id !== id);
  await kvSet(KEY_LPS, newLps);
  revalidatePath('/');
  return { success: true };
}

export async function duplicateLp(sourceId: string) {
  const lps = await getLps();
  const sourceLp = lps.find(item => item.id === sourceId);
  if (!sourceLp) throw new Error('コピー元のLPが見つかりません');

  const newLp = JSON.parse(JSON.stringify(sourceLp)) as LpData;

  const baseTitle = `${sourceLp.title}のコピー`;
  let newTitle = baseTitle;
  let count = 1;

  while (lps.some(item => item.title === newTitle)) {
    newTitle = `${baseTitle}${count}`;
    count++;
  }

  const now = new Date().toISOString();

  newLp.id = crypto.randomUUID();
  newLp.title = newTitle;
  newLp.slug = `${sourceLp.slug}-copy-${Date.now().toString(36)}`;
  newLp.status = 'draft';
  newLp.createdAt = now;
  newLp.updatedAt = now;
  newLp.password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-7);

  lps.push(newLp);
  await kvSet(KEY_LPS, lps);
  revalidatePath('/');
  return { success: true };
}

export async function uploadImage(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file uploaded');

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.name.split('.').pop() || 'bin';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: uniqueName,
    Body: buffer,
    ContentType: file.type,
  }));

  return `${R2_PUBLIC_URL}/${uniqueName}`;
}

export async function generateRandomPassword() {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-7);
}

export async function getBlobList() {
  const result = await r2.send(new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    MaxKeys: 100,
  }));

  return (result.Contents || [])
    .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
    .map(obj => `${R2_PUBLIC_URL}/${obj.Key}`);
}
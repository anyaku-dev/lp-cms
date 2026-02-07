'use server';

import { revalidatePath } from 'next/cache';
import { Redis } from '@upstash/redis';
import { put, list } from '@vercel/blob';

// --- DB設定 (Upstash Redis) ---
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN!,
});

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
  const settings = await redis.get<GlobalSettings>(KEY_SETTINGS);
  
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
  await redis.set(KEY_SETTINGS, settings);
  revalidatePath('/');
  return { success: true };
}

// --- LP管理 ---

export async function getLps() {
  const lps = await redis.get<any[]>(KEY_LPS) || [];
  
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

  await redis.set(KEY_LPS, lps);
  revalidatePath('/');
  revalidatePath(`/${lp.slug}`);
  return { success: true };
}

export async function deleteLp(id: string) {
  const lps = await getLps();
  const newLps = lps.filter(item => item.id !== id);
  await redis.set(KEY_LPS, newLps);
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
  await redis.set(KEY_LPS, lps);
  revalidatePath('/');
  return { success: true };
}

export async function uploadImage(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file uploaded');

  const blob = await put(file.name, file, {
    access: 'public',
    addRandomSuffix: true,
  });

  return blob.url;
}

export async function generateRandomPassword() {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-7);
}

export async function getBlobList() {
  const { blobs } = await list({ limit: 100 });
  return blobs.map(b => b.url);
}
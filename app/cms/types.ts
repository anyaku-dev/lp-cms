// 型定義と定数をここに分離します
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
  links?: LinkArea[];
};

export type TrackingConfig = {
  gtm?: string;
  meta?: string;
  pixel?: string;
  useDefault: boolean;
};

export type LpData = {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'public' | 'private';
  password?: string;
  images: ImageData[];
  timer: { enabled: boolean; periodDays: number };
  tracking: TrackingConfig;
  updatedAt: string;
};

export const DEFAULT_TRACKING: TrackingConfig = {
  gtm: 'GTM-TN6P9QF8', // デフォルト
  meta: '',
  pixel: '',
  useDefault: true,
};
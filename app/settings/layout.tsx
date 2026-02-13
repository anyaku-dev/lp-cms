import type { Metadata } from 'next';

const siteTitle = '爆速画像LPコーディングPRO';
const siteDescription =
  'LPの画像コーディングと、実装を爆速にする『LP専用』CMSツール。LP検証を高速化し、広告パフォーマンスの改善、売り上げアップに貢献。';

export const metadata: Metadata = {
  title: `アカウント設定 | ${siteTitle}`,
  description: siteDescription,
  icons: { icon: '/favicon.ico', apple: '/favicon.ico' },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    images: [{ url: '/ogp.jpg', width: 1200, height: 630, alt: siteTitle }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/ogp.jpg'],
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

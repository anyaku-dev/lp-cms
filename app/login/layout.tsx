import type { Metadata } from 'next';

const siteTitle = '爆速画像LPコーディングPRO';

export const metadata: Metadata = {
  title: `ログイン | ${siteTitle}`,
  icons: { icon: '/favicon.ico', apple: '/favicon.ico' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

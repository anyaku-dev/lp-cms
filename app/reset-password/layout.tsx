import type { Metadata } from 'next';

const siteTitle = '爆速画像LPコーディングPRO';

export const metadata: Metadata = {
  title: `パスワード再設定 | ${siteTitle}`,
  icons: { icon: '/favicon.ico', apple: '/favicon.ico' },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

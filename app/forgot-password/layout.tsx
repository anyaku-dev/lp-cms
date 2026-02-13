import type { Metadata } from 'next';

const siteTitle = '爆速画像LPコーディングPRO';

export const metadata: Metadata = {
  title: `パスワードをお忘れですか？ | ${siteTitle}`,
  icons: { icon: '/favicon.ico', apple: '/favicon.ico' },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

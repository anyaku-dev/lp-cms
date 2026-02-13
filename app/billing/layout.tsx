import type { Metadata } from 'next';

const siteTitle = '爆速画像LPコーディングPRO';

export const metadata: Metadata = {
  title: siteTitle,
  icons: { icon: '/favicon.ico', apple: '/favicon.ico' },
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com', // Vercel Blobのドメインを許可
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev', // Cloudflare R2の公開ドメインを許可
      },
    ],
  },
};

export default nextConfig;
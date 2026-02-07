/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com', // Vercel Blobのドメインを許可
      },
    ],
  },
};

export default nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.anipixcdn.co',
      },
      {
        protocol: 'https',
        hostname: 'anikototv.to',
      },
      {
        protocol: 'https',
        hostname: '**.anipixcdn.co',
      },
    ],
    // Since images are from scraped sources, allow unoptimized as fallback
    unoptimized: false,
  },
};

export default nextConfig;

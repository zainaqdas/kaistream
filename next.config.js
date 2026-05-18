/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverExternalPackages: ['axios', 'cheerio'],
  },
};

export default nextConfig;

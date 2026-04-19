/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
  },
  transpilePackages: ['@tekstil/db', '@tekstil/contracts', '@tekstil/erp-mikro'],
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;

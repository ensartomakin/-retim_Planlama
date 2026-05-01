/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    // Prisma query engine dosyalarının server bundle'a dahil edilmesi için
    // Prisma'yı external bırakıyoruz (Next file tracing kopyalasın).
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  // Next.js 14+ ayarı: server bundle'da bu paketleri external bırak.
  serverExternalPackages: ['@prisma/client', 'prisma'],
  transpilePackages: ['@tekstil/db', '@tekstil/contracts', '@tekstil/erp-mikro'],
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;

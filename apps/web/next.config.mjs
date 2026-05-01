import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    // Prisma query engine dosyalarının server bundle'a dahil edilmesi için
    // Prisma'yı external bırakıyoruz (Next file tracing kopyalasın).
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    // Monorepo'da workspace paketlerindeki (packages/db) runtime dosyalarını da trace et.
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  // Next.js 14+ ayarı: server bundle'da bu paketleri external bırak.
  serverExternalPackages: ['@prisma/client', 'prisma'],
  transpilePackages: ['@tekstil/db', '@tekstil/contracts', '@tekstil/erp-mikro'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...(config.plugins ?? []), new PrismaPlugin()];
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;

import type { NextConfig } from 'next';
import path from 'path';

const isCFPages = process.env.CF_PAGES === '1';

const nextConfig: NextConfig = {
  output: isCFPages ? 'export' : undefined,
  trailingSlash: isCFPages,
  images: {
    unoptimized: isCFPages,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
};

export default nextConfig;

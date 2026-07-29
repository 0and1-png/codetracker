import type { NextConfig } from 'next';

const isCloudflarePages = process.env.CF_PAGES === '1';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.dev.coze.site'],
  // Cloudflare Pages 使用静态导出
  output: isCloudflarePages ? 'export' : undefined,
  images: {
    // 静态导出不支持 next/image 优化，使用 unoptimized
    unoptimized: isCloudflarePages,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from 'next';
import path from 'path';

const isCloudflarePages = process.env.CF_PAGES === '1';

const nextConfig: NextConfig = {
  ...(isCloudflarePages && { output: 'export' }),
};

export default nextConfig;

#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

# Cloudflare Pages 环境：使用 @cloudflare/next-on-pages 支持 SSR
if [ "${CF_PAGES:-}" = "1" ]; then
  echo "Detected Cloudflare Pages environment, using @cloudflare/next-on-pages..."
  
  # 确保依赖已安装（含 legacy-peer-deps）
  pnpm install --prefer-frozen-lockfile 2>/dev/null || pnpm install
  
  # 先运行 Next.js 构建生成 .vercel/output
  echo "Running Next.js build..."
  pnpm next build
  
  # 再用 next-on-pages 转换为 Workers 兼容格式
  echo "Converting to Cloudflare Workers format..."
  npx @cloudflare/next-on-pages
  
  echo "Cloudflare Pages build completed successfully!"
  exit 0
fi

# Vercel 环境检测
if [ "${VERCEL:-}" = "1" ]; then
  echo "Detected Vercel environment, using Vercel-optimized build..."
  pnpm next build
  echo "Vercel build completed successfully!"
  exit 0
fi

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo "Building the Next.js project..."
pnpm next build

echo "Bundling server with tsup..."
pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

echo "Build completed successfully!"

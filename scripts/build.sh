#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

# Cloudflare Pages 环境检测
if [ "${CF_PAGES:-}" = "1" ]; then
  # 防止 @cloudflare/next-on-pages 内部嵌套调用时重复安装依赖
  if [ "${__CF_BUILD_STARTED:-}" != "1" ]; then
    export __CF_BUILD_STARTED=1
    echo "Detected Cloudflare Pages environment, using @cloudflare/next-on-pages..."
    pnpm install
    pnpm @cloudflare/next-on-pages
    echo "Cloudflare Pages build completed successfully!"
  else
    # 嵌套调用：直接运行 Next.js 构建，不重复安装依赖
    echo "Nested build call detected, running Next.js build directly..."
    pnpm next build
  fi
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

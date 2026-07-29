#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

# Cloudflare Pages 环境检测
if [ "${CF_PAGES:-}" = "1" ]; then
  # 使用文件标志检测嵌套调用（环境变量在 Vercel CLI 子进程中可能不继承）
  NESTED_FLAG="/tmp/__cf_nested_build_flag"
  if [ -f "${NESTED_FLAG}" ]; then
    echo "Nested build detected, running Next.js build directly (skip npm install)..."
    pnpm next build
    exit $?
  fi

  echo "Detected Cloudflare Pages environment, using @cloudflare/next-on-pages..."
  pnpm install
  # 创建文件标志，告诉嵌套调用跳过 install
  touch "${NESTED_FLAG}"
  pnpm @cloudflare/next-on-pages
  rm -f "${NESTED_FLAG}"
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

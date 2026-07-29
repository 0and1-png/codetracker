#!/bin/bash
# Cloudflare Pages 构建脚本 - 静态导出模式
set -e

echo "🏗️ Running Next.js static export build..."
CF_PAGES=1 pnpm next build

echo "✅ Build complete! Output in ./out"

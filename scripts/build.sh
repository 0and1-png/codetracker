#!/bin/bash
# Cloudflare Pages 构建脚本
set -e

echo " Installing dependencies..."
pnpm install --frozen-lockfile

echo "🏗️ Running vercel build (no install, use existing node_modules)..."
npx vercel build --no-install

echo "⚡ Converting to Cloudflare Workers format..."
npx @cloudflare/next-on-pages --skip-build

echo "✅ Build complete!"

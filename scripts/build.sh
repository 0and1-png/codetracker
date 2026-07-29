#!/bin/bash
# Cloudflare Pages 构建脚本
set -e

echo "🏗️ Running vercel build..."
npx vercel build

echo "⚡ Converting to Cloudflare Workers format..."
npx @cloudflare/next-on-pages --skip-build

echo "✅ Build complete!"

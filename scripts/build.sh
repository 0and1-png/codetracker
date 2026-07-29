#!/bin/bash
set -e

echo "️ Building with @cloudflare/next-on-pages..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Step 2: Build with next-on-pages (includes vercel build internally)
echo "🔧 Running @cloudflare/next-on-pages..."
npx @cloudflare/next-on-pages --output-dir .vercel/output/static

# Verify output exists
if [ ! -d ".vercel/output/static" ]; then
  echo "❌ Output directory not created!"
  exit 1
fi

echo "✅ Build complete!"
ls -la .vercel/output/static/

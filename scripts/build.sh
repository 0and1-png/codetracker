#!/bin/bash
set -e

echo "️ Building with @cloudflare/next-on-pages..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Step 2: Build with next-on-pages (includes vercel build internally)
echo "🔧 Running @cloudflare/next-on-pages..."
npx @cloudflare/next-on-pages

echo "✅ Build complete!"

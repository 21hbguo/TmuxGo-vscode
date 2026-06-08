#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install

echo "🔨 Compiling..."
npm run compile

echo "📦 Packaging VSIX..."
npx vsce package

echo "✅ Done! VSIX file:"
ls -lh *.vsix

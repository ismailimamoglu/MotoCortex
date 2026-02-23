#!/bin/bash
set -e

echo "🛠️  Starting MotoCortex Build Repair Protocol..."

echo "1. Cleaning project..."
rm -rf android ios node_modules package-lock.json

echo "2. Installing dependencies..."
npm install

echo "3. Aligning Expo SDK versions..."
npx expo install --fix

echo "4. Regenerating native project (Prebuild)..."
npx expo prebuild --clean --platform android

echo "✅ Repair complete! Now run:"
echo "   npx expo run:android"

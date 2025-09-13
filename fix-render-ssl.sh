#!/bin/bash

echo "🔧 Fixing Render SSL handshake issue..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized. Please run: git init"
    exit 1
fi

echo "📝 Committing SSL fix..."
git add .
git commit -m "Fix SSL handshake issue for Render deployment"

echo "📤 Pushing fix to repository..."
git push origin main

echo "✅ SSL fix pushed to repository!"
echo ""
echo "🔄 Render will automatically redeploy with the fix"
echo ""
echo "🎯 The fix includes:"
echo "- Added proxy_ssl_verify off to nginx configuration"
echo "- This allows nginx to connect to backend without SSL verification"
echo ""
echo "⏳ Wait 2-3 minutes for Render to redeploy"
echo "🌐 Then test your app at: https://campusconnectplayhub.onrender.com"
echo ""
echo "💡 If the issue persists, check Render logs for any other errors"

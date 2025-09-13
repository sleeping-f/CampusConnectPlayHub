#!/bin/bash

echo "🚀 Deploying CampusConnectPlayHub to Render..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized. Please run: git init"
    exit 1
fi

# Check if files are committed
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Committing changes..."
    git add .
    git commit -m "Deploy to Render - $(date)"
fi

# Push to remote
echo "📤 Pushing to remote repository..."
git push origin main

echo "✅ Code pushed to repository!"
echo ""
echo "🌐 Next steps for Render deployment:"
echo "1. Go to https://render.com"
echo "2. Sign up with GitHub"
echo "3. Click 'New +' → 'Blueprint'"
echo "4. Connect your GitHub repository"
echo "5. Render will detect render.yaml automatically"
echo "6. Click 'Apply' to deploy all services"
echo ""
echo "🎉 Your app will be live at:"
echo "Frontend: https://campusconnect-frontend.onrender.com"
echo "Backend: https://campusconnect-backend.onrender.com"
echo ""
echo "💡 Don't forget to set your environment variables:"
echo "- JWT_SECRET (generate a secure key)"
echo "- GOOGLE_CLIENT_ID (your Google OAuth client ID)"
echo "- GOOGLE_CLIENT_SECRET (your Google OAuth client secret)"

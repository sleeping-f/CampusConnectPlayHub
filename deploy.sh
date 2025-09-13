#!/bin/bash

echo "🚀 Deploying CampusConnectPlayHub to Cloud..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized. Please run: git init"
    exit 1
fi

# Check if files are committed
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Committing changes..."
    git add .
    git commit -m "Deploy to cloud - $(date)"
fi

# Push to remote
echo "📤 Pushing to remote repository..."
git push origin main

echo "✅ Code pushed to repository!"
echo ""
echo "🌐 Next steps:"
echo "1. Go to https://railway.app"
echo "2. Sign up with GitHub"
echo "3. Click 'New Project'"
echo "4. Select 'Deploy from GitHub repo'"
echo "5. Choose your CampusConnectPlayHub repository"
echo "6. Railway will automatically deploy your app!"
echo ""
echo "🎉 Your app will be live at: https://your-app-name.railway.app"

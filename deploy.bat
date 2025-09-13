@echo off
echo 🚀 Deploying CampusConnectPlayHub to Cloud...

REM Check if git is initialized
if not exist ".git" (
    echo ❌ Git not initialized. Please run: git init
    pause
    exit /b 1
)

REM Check if files are committed
git status --porcelain > temp_status.txt
if %errorlevel% neq 0 (
    echo ❌ Git status check failed
    del temp_status.txt
    pause
    exit /b 1
)

for /f %%i in (temp_status.txt) do (
    echo 📝 Committing changes...
    git add .
    git commit -m "Deploy to cloud - %date% %time%"
    goto :push
)

:push
del temp_status.txt

REM Push to remote
echo 📤 Pushing to remote repository...
git push origin main

echo ✅ Code pushed to repository!
echo.
echo 🌐 Next steps:
echo 1. Go to https://railway.app
echo 2. Sign up with GitHub
echo 3. Click 'New Project'
echo 4. Select 'Deploy from GitHub repo'
echo 5. Choose your CampusConnectPlayHub repository
echo 6. Railway will automatically deploy your app!
echo.
echo 🎉 Your app will be live at: https://your-app-name.railway.app
pause

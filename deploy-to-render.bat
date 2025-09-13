@echo off
echo 🚀 Deploying CampusConnectPlayHub to Render...

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
    git commit -m "Deploy to Render - %date% %time%"
    goto :push
)

:push
del temp_status.txt

REM Push to remote
echo 📤 Pushing to remote repository...
git push origin main

echo ✅ Code pushed to repository!
echo.
echo 🌐 Next steps for Render deployment:
echo 1. Go to https://render.com
echo 2. Sign up with GitHub
echo 3. Click 'New +' → 'Blueprint'
echo 4. Connect your GitHub repository
echo 5. Render will detect render.yaml automatically
echo 6. Click 'Apply' to deploy all services
echo.
echo 🎉 Your app will be live at:
echo Frontend: https://campusconnect-frontend.onrender.com
echo Backend: https://campusconnect-backend.onrender.com
echo.
echo 💡 Don't forget to set your environment variables:
echo - JWT_SECRET (generate a secure key)
echo - GOOGLE_CLIENT_ID (your Google OAuth client ID)
echo - GOOGLE_CLIENT_SECRET (your Google OAuth client secret)
pause

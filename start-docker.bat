@echo off
echo Starting CampusConnectPlayHub with Docker...
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo Creating .env file from template...
    copy env.example .env
    echo.
    echo IMPORTANT: Please edit the .env file with your actual values before continuing.
    echo Especially set your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
    echo.
    pause
)

REM Build and start containers
echo Building and starting Docker containers...
echo This may take a few minutes on first run...
echo.

docker-compose up --build

echo.
echo Application stopped.
pause

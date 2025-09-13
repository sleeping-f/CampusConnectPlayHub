#!/bin/bash

echo "Starting CampusConnectPlayHub with Docker..."
echo

# Check if Docker is running
if ! docker version >/dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp env.example .env
    echo
    echo "IMPORTANT: Please edit the .env file with your actual values before continuing."
    echo "Especially set your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
    echo
    read -p "Press Enter to continue after editing .env file..."
fi

# Build and start containers
echo "Building and starting Docker containers..."
echo "This may take a few minutes on first run..."
echo

docker-compose up --build

echo
echo "Application stopped."

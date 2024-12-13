#!/bin/bash

echo "Pulling latest changes..."
git pull origin main

# Check if there are merge conflicts
if [ $? -ne 0 ]; then
  echo "Error: Merge conflicts detected. Please resolve them manually."
  exit 1
fi

echo "Stopping containers..."
docker-compose down

echo "Removing old images..."
docker rmi openai-api-tester_web

echo "Building and starting new containers..."
docker-compose up -d --build

echo "Cleaning up..."
docker system prune -f

echo "Done! Application should be running at http://localhost:3007" 

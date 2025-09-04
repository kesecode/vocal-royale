#!/bin/bash
# Script to start backend for E2E tests

set -e

echo "🐳 Starting PocketBase backend for E2E tests..."

# Check if backend is already running  
if curl -s http://127.0.0.1:7090/ | grep -q "File not found" 2>/dev/null; then
    echo "✅ Backend already running on port 7090"
    exit 0
fi

# Navigate to app root (one level up from project root)
cd "$(dirname "$0")/../../.."

# Check if docker-compose exists
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Build and start only the backend service using E2E compose file
echo "🏗️  Building backend..."
docker compose -f tests/e2e/config/compose.e2e.yml build backend

echo "🚀 Starting backend..."
docker compose -f tests/e2e/config/compose.e2e.yml up -d backend

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s --connect-timeout 2 http://127.0.0.1:7090/ | grep -q "File not found" 2>/dev/null; then
        echo "✅ Backend is ready!"
        exit 0
    fi
    # Use || true to prevent the script from failing if curl returns non-zero
    echo "   Attempt $i/30: Backend not ready yet..." || true
    sleep 2
done

echo "❌ Backend failed to start within 60 seconds"
echo "📋 Container logs:"
docker compose -f tests/e2e/config/compose.e2e.yml logs backend || echo "Could not retrieve logs"
exit 1
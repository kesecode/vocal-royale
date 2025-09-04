#!/bin/bash
# Script to stop backend after E2E tests

set -e

echo "Stopping PocketBase backend..."

# Navigate to app root
cd "$(dirname "$0")/../../.."

# Stop and remove the E2E backend service (with volumes for clean state)
docker compose -f tests/e2e/config/compose.e2e.yml down -v

echo "✅ Backend stopped"
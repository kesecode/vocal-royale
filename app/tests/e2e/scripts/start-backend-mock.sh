#!/bin/bash
# Alternative script for E2E tests without Docker backend
# Uses enhanced route interception for more realistic testing

set -e

echo "🎭 Starting mock backend for E2E tests..."
echo "ℹ️  This creates a mock server that simulates PocketBase API responses"

# For now, we use route interception in the tests themselves
# This could be extended to run a real mock server on port 8090

echo "✅ Mock backend ready (handled by route interception in tests)"
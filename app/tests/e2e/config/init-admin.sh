#!/bin/sh
# Script to initialize admin user for E2E tests

echo "Creating admin user for E2E tests..."
/pb/pocketbase superuser upsert admin_db@vocal.royale vocal_royale_2025

echo "Starting PocketBase server..."
exec /pb/pocketbase serve --http=0.0.0.0:8090
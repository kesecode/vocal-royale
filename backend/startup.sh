#!/bin/sh
set -e

echo "🚀 Starting PocketBase..."

# Start PocketBase in the background
/pb/pocketbase serve --http=0.0.0.0:8090 &
PB_PID=$!

echo "⏳ Waiting for PocketBase API to be ready..."

# Wait for PocketBase API to be available
max_attempts=30
attempt=0
until curl -s http://localhost:8090/api/health > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "❌ PocketBase API failed to start after ${max_attempts} attempts"
    kill $PB_PID 2>/dev/null || true
    exit 1
  fi
  echo "   Attempt $attempt/$max_attempts - waiting..."
  sleep 1
done

echo "✅ PocketBase API is ready!"

# Configure APP_URL setting if environment variable is set
if [ -n "$APP_URL" ]; then
  echo "🔧 Configuring PocketBase APP_URL setting to: $APP_URL"

  # Login as admin to get auth token
  echo "🔐 Authenticating as admin..."
  AUTH_RESPONSE=$(curl -s -X POST http://localhost:8090/api/admins/auth-with-password \
    -H "Content-Type: application/json" \
    -d "{\"identity\":\"${PB_ADMIN_EMAIL}\",\"password\":\"${PB_ADMIN_PASSWORD}\"}" 2>/dev/null || echo '{}')

  TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$TOKEN" ]; then
    echo "✅ Admin authentication successful"

    # Update settings with APP_URL
    echo "📝 Updating application settings..."
    SETTINGS_RESPONSE=$(curl -s -X PATCH http://localhost:8090/api/settings \
      -H "Content-Type: application/json" \
      -H "Authorization: $TOKEN" \
      -d "{\"meta\":{\"appUrl\":\"${APP_URL}\"}}" 2>/dev/null || echo '{}')

    if echo "$SETTINGS_RESPONSE" | grep -q "appUrl"; then
      echo "✅ APP_URL configured successfully: $APP_URL"
    else
      echo "⚠️  Warning: Could not verify APP_URL configuration"
      echo "   Response: $SETTINGS_RESPONSE"
    fi
  else
    echo "⚠️  Warning: Admin authentication failed - APP_URL not configured"
    echo "   Response: $AUTH_RESPONSE"
    echo "   Make sure PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD are correct"
  fi
else
  echo "ℹ️  APP_URL environment variable not set - skipping configuration"
fi

echo "🎉 PocketBase startup complete!"
echo "📧 E-mail links will use: ${APP_URL:-<not configured>}"
echo ""

# Bring PocketBase process to foreground
wait $PB_PID

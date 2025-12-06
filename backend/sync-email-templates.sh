#!/bin/sh
# Script to sync email templates from database to PocketBase collection settings

if [ -z "$1" ]; then
  echo "❌ Error: Auth token required"
  echo "Usage: $0 <auth_token>"
  exit 1
fi

TOKEN=$1

echo "📧 Syncing email templates from database to collection settings..."

# Fetch app settings for template variable replacement
echo "   Loading app settings..."
APP_SETTINGS_JSON=$(curl -s "http://localhost:8090/api/collections/app_settings/records" \
  -H "Authorization: $TOKEN")

# Extract app_name and app_url from settings using Python for reliable JSON parsing
APP_NAME=$(echo "$APP_SETTINGS_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data.get('items', []):
    if item.get('key') == 'app_name':
        print(item.get('value', ''))
        break
")

APP_URL=$(echo "$APP_SETTINGS_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data.get('items', []):
    if item.get('key') == 'app_url':
        print(item.get('value', ''))
        break
")

# Fallback to defaults if not found
if [ -z "$APP_NAME" ]; then
  APP_NAME="Vocal Royale"
  echo "   ⚠️  app_name not found in settings, using default: $APP_NAME"
else
  echo "   Found app_name: $APP_NAME"
fi

if [ -z "$APP_URL" ]; then
  APP_URL="http://localhost:3000"
  echo "   ⚠️  app_url not found in settings, using default: $APP_URL"
else
  echo "   Found app_url: $APP_URL"
fi

# Fetch active templates from email_templates collection
TEMPLATES_JSON=$(curl -s "http://localhost:8090/api/collections/email_templates/records?filter=(is_active=true)" \
  -H "Authorization: $TOKEN")

# Check if fetch was successful
if ! echo "$TEMPLATES_JSON" | grep -q "items"; then
  echo "⚠️  Warning: Could not fetch email templates from database"
  echo "   Response: $TEMPLATES_JSON"
  exit 0
fi

# Extract templates count
TEMPLATES_COUNT=$(echo "$TEMPLATES_JSON" | grep -o '"totalItems":[0-9]*' | grep -o '[0-9]*')
echo "   Found $TEMPLATES_COUNT active templates"

if [ "$TEMPLATES_COUNT" = "0" ]; then
  echo "   No active templates to sync"
  exit 0
fi

# Function to extract template by type and collection_ref
extract_template() {
  local type=$1
  local collection=$2
  local field=$3  # "body" or "subject"

  # Use python to parse JSON properly (more reliable than grep)
  echo "$TEMPLATES_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data.get('items', []):
    if item.get('template_type') == '$type' and item.get('collection_ref') == '$collection':
        print(item.get('$field', ''))
        break
"
}

# Function to replace template variables
replace_variables() {
  local template=$1

  # Replace {app_name} and {app_url} with actual values
  # Note: sed on macOS requires different syntax than GNU sed
  echo "$template" | sed "s/{app_name}/$APP_NAME/g" | sed "s|{app_url}|$APP_URL|g"
}

# Sync users collection templates
echo "   Syncing users collection templates..."

# Extract templates and replace variables
USER_VERIFICATION_BODY=$(replace_variables "$(extract_template "verification" "users" "body")")
USER_VERIFICATION_SUBJECT=$(replace_variables "$(extract_template "verification" "users" "subject")")
USER_RESET_BODY=$(replace_variables "$(extract_template "password_reset" "users" "body")")
USER_RESET_SUBJECT=$(replace_variables "$(extract_template "password_reset" "users" "subject")")

if [ -n "$USER_VERIFICATION_BODY" ] && [ -n "$USER_RESET_BODY" ]; then
  # Create JSON payload with proper escaping
  USERS_PAYLOAD=$(cat <<EOF
{
  "options": {
    "verificationTemplate": {
      "body": $(echo "$USER_VERIFICATION_BODY" | jq -Rs .),
      "subject": "$USER_VERIFICATION_SUBJECT"
    },
    "resetPasswordTemplate": {
      "body": $(echo "$USER_RESET_BODY" | jq -Rs .),
      "subject": "$USER_RESET_SUBJECT"
    }
  }
}
EOF
)

  USERS_RESPONSE=$(curl -s -X PATCH "http://localhost:8090/api/collections/users" \
    -H "Content-Type: application/json" \
    -H "Authorization: $TOKEN" \
    -d "$USERS_PAYLOAD")

  if echo "$USERS_RESPONSE" | grep -q "\"name\":\"users\""; then
    echo "   ✅ Users collection templates synced"
  else
    echo "   ⚠️  Failed to sync users collection templates"
  fi
else
  echo "   ⚠️  Skipping users collection (templates not found in database)"
fi

# Sync _superusers collection templates
echo "   Syncing _superusers collection templates..."

# Extract templates and replace variables
SUPERUSER_VERIFICATION_BODY=$(replace_variables "$(extract_template "verification" "_superusers" "body")")
SUPERUSER_VERIFICATION_SUBJECT=$(replace_variables "$(extract_template "verification" "_superusers" "subject")")
SUPERUSER_RESET_BODY=$(replace_variables "$(extract_template "password_reset" "_superusers" "body")")
SUPERUSER_RESET_SUBJECT=$(replace_variables "$(extract_template "password_reset" "_superusers" "subject")")

if [ -n "$SUPERUSER_VERIFICATION_BODY" ] && [ -n "$SUPERUSER_RESET_BODY" ]; then
  # Create JSON payload with proper escaping
  SUPERUSERS_PAYLOAD=$(cat <<EOF
{
  "options": {
    "verificationTemplate": {
      "body": $(echo "$SUPERUSER_VERIFICATION_BODY" | jq -Rs .),
      "subject": "$SUPERUSER_VERIFICATION_SUBJECT"
    },
    "resetPasswordTemplate": {
      "body": $(echo "$SUPERUSER_RESET_BODY" | jq -Rs .),
      "subject": "$SUPERUSER_RESET_SUBJECT"
    }
  }
}
EOF
)

  SUPERUSERS_RESPONSE=$(curl -s -X PATCH "http://localhost:8090/api/collections/_superusers" \
    -H "Content-Type: application/json" \
    -H "Authorization: $TOKEN" \
    -d "$SUPERUSERS_PAYLOAD")

  if echo "$SUPERUSERS_RESPONSE" | grep -q "\"name\":\"_superusers\""; then
    echo "   ✅ Superusers collection templates synced"
  else
    echo "   ⚠️  Failed to sync _superusers collection templates"
  fi
else
  echo "   ⚠️  Skipping _superusers collection (templates not found in database)"
fi

echo "✅ Email template sync completed"

#!/bin/sh
# Script to sync email templates from database to PocketBase collection settings

if [ -z "$1" ]; then
  echo "❌ Error: Auth token required"
  echo "Usage: $0 <auth_token>"
  exit 1
fi

TOKEN=$1

echo "📧 Syncing email templates from database to collection settings..."

# Fetch active templates from email_templates collection
TEMPLATES_JSON=$(curl -s "http://localhost:8090/api/collections/email_templates/records?filter=is_active=true" \
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

  echo "$TEMPLATES_JSON" | grep -o "{[^}]*\"template_type\":\"$type\"[^}]*\"collection_ref\":\"$collection\"[^}]*}" | \
    grep -o "\"$field\":\"[^\"]*" | sed 's/^"'$field'":"//' | head -n 1
}

# Sync users collection templates
echo "   Syncing users collection templates..."

USER_VERIFICATION_BODY=$(extract_template "verification" "users" "body")
USER_VERIFICATION_SUBJECT=$(extract_template "verification" "users" "subject")
USER_RESET_BODY=$(extract_template "password_reset" "users" "body")
USER_RESET_SUBJECT=$(extract_template "password_reset" "users" "subject")

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

SUPERUSER_VERIFICATION_BODY=$(extract_template "verification" "_superusers" "body")
SUPERUSER_VERIFICATION_SUBJECT=$(extract_template "verification" "_superusers" "subject")
SUPERUSER_RESET_BODY=$(extract_template "password_reset" "_superusers" "body")
SUPERUSER_RESET_SUBJECT=$(extract_template "password_reset" "_superusers" "subject")

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

#!/usr/bin/env bash
# ============================================================================
# Garage Parts Marketplace - Remote Migration Launcher (Bash/curl)
#
#   ./migrate-remote.sh                                → migrate + full demo seed
#   ./migrate-remote.sh <url> <key> fresh [demo|core|none]
#     e.g. ./migrate-remote.sh https://xxx.onrender.com "$KEY" fresh demo
# ============================================================================

API_URL="${1:-https://garage-parts-marketplace-official.onrender.com}"
APP_KEY="${2:-base64:sM5Th/eioZw9bH6Hj6gsMw4ooLgjauK4bC1/9lpQr6E=}"
FRESH="${3:-}"
SEEDER="${4:-demo}"

echo "=== Garage Parts Marketplace - Remote Database ==="
echo "Target API: $API_URL"
echo "Mode: ${FRESH:+FRESH WIPE + }migrate + seed ($SEEDER)"

if [ "$FRESH" = "fresh" ]; then
  echo ""
  echo "WARNING: this WIPES the remote database first."
  read -r -p "Type YES to continue: " CONFIRM
  if [ "$CONFIRM" != "YES" ]; then
    echo "Aborted — nothing was touched."
    exit 0
  fi
fi

echo ""
echo "1. Checking remote migration status..."
curl -s -X GET "$API_URL/api/v1/system/migrate-status" \
     -H "Accept: application/json" \
     -H "X-App-Key: $APP_KEY"

echo ""
echo ""
echo "2. Executing remote migrations & seeders..."
IS_FRESH="false"
[ "$FRESH" = "fresh" ] && IS_FRESH="true"
curl -s -X POST "$API_URL/api/v1/system/migrate-seed" \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -H "X-App-Key: $APP_KEY" \
     -d "{\"fresh\": $IS_FRESH, \"seeder\": \"$SEEDER\"}"

echo ""
echo ""
echo "3. Verifying system health endpoint..."
curl -s -X GET "$API_URL/api/v1/health"

echo ""

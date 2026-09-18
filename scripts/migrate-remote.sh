#!/usr/bin/env bash
# ============================================================================
# Garage Parts Marketplace - Remote Migration Launcher (Bash/curl)
# ============================================================================

API_URL="${1:-https://garage-parts-marketplace-official.onrender.com}"
APP_KEY="${2:-base64:sM5Th/eioZw9bH6Hj6gsMw4ooLgjauK4bC1/9lpQr6E=}"

echo "=== Garage Parts Marketplace - Remote Database Migration ==="
echo "Target API: $API_URL"

echo ""
echo "1. Checking remote migration status..."
curl -s -X GET "$API_URL/api/v1/system/migrate-status" \
     -H "Accept: application/json" \
     -H "X-App-Key: $APP_KEY"

echo ""
echo ""
echo "2. Executing remote migrations & seeders..."
curl -s -X POST "$API_URL/api/v1/system/migrate-seed" \
     -H "Accept: application/json" \
     -H "X-App-Key: $APP_KEY"

echo ""
echo ""
echo "3. Verifying system health endpoint..."
curl -s -X GET "$API_URL/api/v1/health"

echo ""

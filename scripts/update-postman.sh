#!/usr/bin/env bash
# ============================================================================
# Garage Parts Marketplace - Postman Collection Generator & Updater (Bash)
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../backend"

echo "========================================================="
echo "  Garage Marketplace - Updating Postman API Collection   "
echo "========================================================="

cd "${BACKEND_DIR}"
php artisan postman:generate

echo ""
echo "[SUCCESS] Postman collection updated at: docs/postman/garage-parts-session.postman_collection.json"
echo "Import this file into Postman via Import -> File / Drag & Drop!"

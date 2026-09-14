#!/usr/bin/env bash
# Script to run VaultX Bot with auto-restart on any Linux/VPS server
cd "$(dirname "$0")" || exit 1

echo "========================================="
echo "   Starting VaultX Bot (Auto-Restart)    "
echo "========================================="

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting node src/index.js..."
    node src/index.js
    EXIT_CODE=$?
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Bot stopped with code $EXIT_CODE. Restarting in 3 seconds..."
    sleep 3
done

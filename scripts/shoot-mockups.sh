#!/usr/bin/env bash
# Screenshot every design mockup with headless Chrome so the design-critic judges real renders.
# Usage: bash scripts/shoot-mockups.sh
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
OUT=design/screens/shots
mkdir -p "$OUT"
for f in design/screens/*.html; do
  name=$(basename "$f" .html)
  case "$name" in
    screen) size=1920,1080 ;;
    story-card) size=1080,1920 ;;
    *) size=${MOCK_SIZE:-1400,1000} ;;
  esac
  abs=$(cd "$(dirname "$f")" && pwd -W 2>/dev/null || pwd)/$(basename "$f")
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --virtual-time-budget=4000 --window-size="$size" \
    --screenshot="$(pwd -W 2>/dev/null || pwd)/$OUT/$name.png" "file:///$abs" >/dev/null 2>&1
  echo "shot $name ($size)"
done

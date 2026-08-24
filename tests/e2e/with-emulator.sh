#!/usr/bin/env bash
# Chạy bộ test e2e trên Firebase Emulator (DB sạch, không đụng dữ liệu thật).
#
#   ./tests/e2e/with-emulator.sh                    # chạy tất cả
#   ./tests/e2e/with-emulator.sh --only=song-song   # chỉ nhóm 2 sân song song
#
# YÊU CẦU: Java (emulator Realtime Database của Firebase chạy trên JVM).
#   Cài bằng:  brew install --cask temurin
set -euo pipefail
cd "$(dirname "$0")/../.."

if ! java -version >/dev/null 2>&1; then
  echo "❌ Chưa có Java — emulator Realtime Database cần JVM."
  echo "   Cài:  brew install --cask temurin"
  echo "   Hoặc chạy trên DB dev thật:  npm run test:e2e:live"
  exit 1
fi

exec npx --yes firebase emulators:exec \
  --only database \
  --project cocvuong-e2e \
  "npx tsx tests/e2e/run.ts $*"

#!/usr/bin/env bash
# Локальный сервер для зеркала.
# Использование: ./scripts/serve.sh [порт]
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${1:-8000}"
ROOT="$(pwd)/site"

if [ ! -d "$ROOT" ]; then
  echo "Нет папки site/ — сначала скачайте зеркало." >&2
  exit 1
fi

echo "http://localhost:${PORT}"
exec python3 -m http.server "$PORT" --directory "$ROOT"

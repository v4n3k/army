#!/usr/bin/env bash
# Локальный сервер: статика + приём заявок на /api/lead.
# Использование: ./scripts/serve.sh [порт]
set -euo pipefail

cd "$(dirname "$0")/.."
export PORT="${1:-8000}"

if [ ! -d site ]; then
  echo "Нет папки site/ — сначала скачайте зеркало." >&2
  exit 1
fi

exec python3 server/app.py

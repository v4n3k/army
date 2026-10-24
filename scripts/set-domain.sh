#!/usr/bin/env bash
# Замена домена во всём зеркале перед публикацией.
# Использование: ./scripts/set-domain.sh https://new-domain.ru
set -euo pipefail

cd "$(dirname "$0")/.."

NEW="${1:-}"
if [ -z "$NEW" ]; then
  echo "Использование: $0 https://new-domain.ru" >&2
  exit 1
fi
NEW="${NEW%/}"

if [ ! -d site ]; then
  echo "Нет папки site/" >&2
  exit 1
fi

COUNT=$(grep -rl 'https://armia-rf.ru' site --include='*.html' --include='*.xml' --include='*.txt' | wc -l | tr -d ' ')

grep -rl 'https://armia-rf.ru' site --include='*.html' --include='*.xml' --include='*.txt' \
  | while IFS= read -r f; do
      perl -pi -e "s{https://armia-rf\.ru}{$NEW}g" "$f"
    done

echo "Домен заменён на $NEW в файлах: $COUNT"

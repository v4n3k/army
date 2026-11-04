#!/usr/bin/env bash
# Ручной деплой сайта на сервер (обычно деплит GitHub Actions, это — запасной путь).
# Использование:
#   ./scripts/deploy.sh               # только статика site/
#   ./scripts/deploy.sh --with-server # + server/app.py и рестарт leadserver
set -euo pipefail

HOST="138.124.127.165"
USER="root"
KEY="$HOME/.ssh/voennyk_deploy"
SITE_PATH="/opt/project/army/site"
APP_PATH="/opt/project/app/app.py"

ssh -i "$KEY" -o BatchMode=yes "$USER@$HOST" 'echo "подключение OK"'

rsync -az --delete -e "ssh -i $KEY" site/ "$USER@$HOST:$SITE_PATH/"
echo "site/ синхронизирован"

if [[ "${1:-}" == "--with-server" ]]; then
	rsync -az -e "ssh -i $KEY" server/app.py "$USER@$HOST:$APP_PATH"
	ssh -i "$KEY" "$USER@$HOST" 'systemctl restart leadserver && sleep 2 && systemctl is-active leadserver'
	echo "server/app.py обновлён, leadserver перезапущен"
fi

curl -fsS "https://voenny-kontrakt.ru/" -o /dev/null && echo "сайт отвечает: https://voenny-kontrakt.ru"

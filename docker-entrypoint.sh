#!/bin/sh
set -e

# Zeabur 注入 WEB_PORT；其他平台常用 PORT；本地默认 80
export WEB_PORT="${WEB_PORT:-${PORT:-80}}"
export PORT="$WEB_PORT"

exec /docker-entrypoint.sh nginx -g "daemon off;"

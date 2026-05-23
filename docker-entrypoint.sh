#!/bin/sh
set -e

# Zeabur 等平台注入 PORT；本地未设置时默认 8080
export PORT="${PORT:-8080}"

exec /docker-entrypoint.sh nginx -g "daemon off;"

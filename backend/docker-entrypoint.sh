#!/bin/sh
set -e
mkdir -p /app/media /app/logs
chown -R www-data:www-data /app/media /app/logs
truncate -s 0 /app/logs/django.log 2>/dev/null || true
truncate -s 0 /app/logs/access.log 2>/dev/null || true
truncate -s 0 /app/logs/error.log 2>/dev/null || true
exec su -s /bin/sh www-data -- "$@"

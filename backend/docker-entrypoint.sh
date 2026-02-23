#!/bin/sh
set -e
mkdir -p /app/media
chown -R www-data:www-data /app/media
exec su -s /bin/sh www-data -- "$@"

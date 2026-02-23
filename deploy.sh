#!/bin/bash
set -e
[ "$(id -u)" -eq 0 ] || exec sudo "$0" "$@"
CONFIG_FILE="${1:-./deploy.conf}"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Config $CONFIG_FILE not found. Usage: $0 [deploy.conf]"
    exit 1
fi
source "$CONFIG_FILE"
[ -z "$APP_DIR" ] && read -p "APP_DIR (path to code): " APP_DIR
[ -z "$DOMAIN" ] && read -p "DOMAIN (e.g. mak-total-safety.pznr.in.rs): " DOMAIN
[ -z "$ENV_FILE" ] && read -p "ENV_FILE (path to backend env): " ENV_FILE
APP_DIR="$(realpath "$APP_DIR")"
ENV_FILE="$(realpath "$ENV_FILE")"
DEPLOY_USER="${SUDO_USER:-$(whoami)}"
API_BASE_URL="${API_BASE_URL:-https://${DOMAIN}}"
LOG_DIR="${LOG_DIR:-/var/log/pznr}"
CERTBOT_WEBROOT="${CERTBOT_WEBROOT:-/var/www/certbot}"
CERTBOT_DNS_MODE="${CERTBOT_DNS_MODE:-webroot}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
CLOUDFLARE_API_TOKEN_FILE="${CLOUDFLARE_API_TOKEN_FILE:-/root/.secrets/certbot/cloudflare.ini}"
FRONTEND_BUILD_DIR="${APP_DIR}/frontend/dist"
STATIC_DIR="${APP_DIR}/staticfiles"
BACKEND_DIR="${APP_DIR}/backend"
NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"
COMPOSE_DIR="${COMPOSE_DIR:-$APP_DIR}"
export PZNR_ENV_FILE="$ENV_FILE"
export PZNR_DOMAIN="$DOMAIN"
export PZNR_CORS_ORIGIN="https://${DOMAIN}"
export PZNR_LOG_DIR="$LOG_DIR"

initialSetup() {
    if ! command -v docker >/dev/null 2>&1; then
        apt-get update
        apt-get install -y ca-certificates curl gnupg
        install -m 0755 -d /etc/apt/keyrings
        if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            chmod a+r /etc/apt/keyrings/docker.gpg
        fi
        if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME:-$UBUNTU_CODENAME}") stable" > /etc/apt/sources.list.d/docker.list
        fi
        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi
    usermod -aG docker "$DEPLOY_USER"
    getent group www-data >/dev/null || groupadd www-data
    usermod -aG www-data "$DEPLOY_USER"
    mkdir -p "$CERTBOT_WEBROOT"
    chown -R www-data:www-data "$CERTBOT_WEBROOT"
    mkdir -p "$LOG_DIR/backend"
    chown 33:33 "$LOG_DIR/backend"
}

setupDatabase() {
    source "$ENV_FILE" 2>/dev/null || true
    export PZNR_DB_NAME="${PZNR_DB_NAME:-pznr}"
    export PZNR_DB_USER="${PZNR_DB_USER:-pznr_user}"
    export PZNR_DB_PASSWORD="${PZNR_DB_PASSWORD:-}"
    export PZNR_POSTGRES_PASSWORD="${PZNR_POSTGRES_PASSWORD:-postgres}"
    cd "$APP_DIR"
    docker compose up -d postgres
    sleep 3
    docker compose exec -T postgres psql -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname = '${PZNR_DB_USER}'" | grep -q 1 || \
        docker compose exec -T postgres psql -U postgres -c "CREATE USER ${PZNR_DB_USER} WITH PASSWORD '${PZNR_DB_PASSWORD}';"
    docker compose exec -T postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '${PZNR_DB_NAME}'" | grep -q 1 || \
        docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE ${PZNR_DB_NAME} OWNER ${PZNR_DB_USER};"
    docker compose exec -T postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${PZNR_DB_NAME} TO ${PZNR_DB_USER};"
}

setupDocker() {
    source "$ENV_FILE" 2>/dev/null || true
    export PZNR_DB_NAME="${PZNR_DB_NAME:-pznr}"
    export PZNR_DB_USER="${PZNR_DB_USER:-pznr_user}"
    export PZNR_DB_PASSWORD="${PZNR_DB_PASSWORD:-}"
    mkdir -p "$LOG_DIR/backend"
    chown 33:33 "$LOG_DIR/backend" 2>/dev/null || true
    cd "$APP_DIR"
    docker compose build backend
    docker compose up -d postgres backend
    if [ ! -d "$FRONTEND_BUILD_DIR" ] || [ -z "$(ls -A "$FRONTEND_BUILD_DIR" 2>/dev/null)" ]; then
        cd "$APP_DIR/frontend"
        if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
            npm ci
            VITE_API_BASE_URL="${API_BASE_URL}" npm run build
        else
            docker run --rm -v "$APP_DIR/frontend:/app" -w /app -e VITE_API_BASE_URL="${API_BASE_URL}" node:20-slim sh -c "npm ci && npm run build"
        fi
    fi
    chown -R www-data:www-data "$FRONTEND_BUILD_DIR" 2>/dev/null || true
    docker compose exec -T backend python manage.py makemigrations documents trainings 2>/dev/null || true
    docker compose exec -T backend python manage.py migrate --noinput 2>/dev/null || true
    docker compose exec -T backend python manage.py collectstatic --noinput 2>/dev/null || true
    mkdir -p "$STATIC_DIR"
    docker compose cp backend:/app/staticfiles/. "$STATIC_DIR/"
    chown -R www-data:www-data "$STATIC_DIR" 2>/dev/null || true
    docker compose restart backend
}

setupNginx() {
    apt-get install -y nginx
    mkdir -p "$(dirname "$NGINX_SITE")" "$LOG_DIR"
    cat > "$NGINX_SITE" << NGINX_80
server {
    listen 80;
    server_name $DOMAIN;
    access_log $LOG_DIR/nginx-access.log;
    error_log $LOG_DIR/nginx-error.log;
    location /.well-known/acme-challenge/ {
        root $CERTBOT_WEBROOT;
    }
    location / {
        return 301 https://\$host\$request_uri;
    }
}
NGINX_80
    ln -sf "$NGINX_SITE" "$NGINX_ENABLED" 2>/dev/null || true
    nginx -t && systemctl reload nginx 2>/dev/null || systemctl start nginx
}

writeNginxSsl() {
    cat >> "$NGINX_SITE" << NGINX_443
server {
    listen 443 ssl;
    server_name $DOMAIN;
    access_log $LOG_DIR/nginx-access.log;
    error_log $LOG_DIR/nginx-error.log;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    client_max_body_size 50M;
    location /media/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /static/ {
        alias $STATIC_DIR/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    location /auth/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cookie_path / "/; HTTPOnly; Secure; SameSite=Lax";
    }
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cookie_path / "/; HTTPOnly; Secure; SameSite=Lax";
    }
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cookie_path / "/; HTTPOnly; Secure; SameSite=Lax";
    }
    location / {
        root $FRONTEND_BUILD_DIR;
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX_443
}

setupSsl() {
    apt-get install -y certbot python3-certbot-nginx
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        echo "Certificate for $DOMAIN already exists, skipping issuance."
    else
        if [ "$CERTBOT_DNS_MODE" = "cloudflare" ]; then
            apt-get install -y python3-certbot-dns-cloudflare
            if [ ! -f "$CLOUDFLARE_API_TOKEN_FILE" ]; then
                echo "Cloudflare API token file not found at $CLOUDFLARE_API_TOKEN_FILE"
                echo "Create it with 'dns_cloudflare_api_token = <YOUR_TOKEN>' and chmod 600."
                exit 1
            fi
            EMAIL_ARG="--register-unsafely-without-email"
            if [ -n "$CERTBOT_EMAIL" ]; then
                EMAIL_ARG="--email $CERTBOT_EMAIL"
            fi
            certbot certonly \
                --dns-cloudflare \
                --dns-cloudflare-credentials "$CLOUDFLARE_API_TOKEN_FILE" \
                -d "$DOMAIN" \
                --non-interactive --agree-tos $EMAIL_ARG || true
        else
            EMAIL_ARG="--register-unsafely-without-email"
            if [ -n "$CERTBOT_EMAIL" ]; then
                EMAIL_ARG="--email $CERTBOT_EMAIL"
            fi
            certbot certonly --webroot -w "$CERTBOT_WEBROOT" -d "$DOMAIN" --non-interactive --agree-tos $EMAIL_ARG || true
        fi
    fi
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        grep -q "listen 443" "$NGINX_SITE" 2>/dev/null || writeNginxSsl
        nginx -t && systemctl reload nginx
    fi
}

setupFirewall() {
    apt-get install -y ufw
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 25/tcp
    ufw default deny incoming
    ufw --force enable
}

setupCron() {
    CRON_CMD="0 0 * * 0 certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
    (crontab -u root -l 2>/dev/null | grep -v "certbot renew" ; echo "$CRON_CMD") | crontab -u root -
}

runAll() {
    initialSetup
    setupDatabase
    setupDocker
    setupNginx
    setupSsl
    setupFirewall
    setupCron
}

case "${2:-all}" in
    initialSetup)    initialSetup ;;
    setupDatabase)  setupDatabase ;;
    setupDocker)    setupDocker ;;
    setupNginx)     setupNginx ;;
    setupSsl)       setupSsl ;;
    setupFirewall)  setupFirewall ;;
    setupCron)      setupCron ;;
    all)            runAll ;;
    *)              echo "Unknown target: $2. Use: initialSetup|setupDatabase|setupDocker|setupNginx|setupSsl|setupFirewall|setupCron|all"; exit 1 ;;
esac

#!/bin/bash
set -e
[ "$(id -u)" -eq 0 ] || exec sudo "$0" "$@"
CONFIG_FILE="${1:-./deploy.conf}"
shift || true
DEPLOY_TARGET="all"
DEPLOY_FLAG=""
CLEAN_LOGS=0
while [ $# -gt 0 ]; do
    case "$1" in
        --quick | --nuclear)
            DEPLOY_FLAG="$1"
            ;;
        --clean-logs)
            CLEAN_LOGS=1
            ;;
        --*)
            echo "Unknown flag: $1" >&2
            echo "Usage: $0 [deploy.conf] [target] [--quick|--nuclear] [--clean-logs]" >&2
            exit 1
            ;;
        *)
            DEPLOY_TARGET="$1"
            ;;
    esac
    shift
done
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Config $CONFIG_FILE not found. Usage: $0 [deploy.conf] [target] [--quick|--nuclear] [--clean-logs]"
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
NGINX_DROP="/etc/nginx/sites-available/pznr-drop-default"
NGINX_DROP_ENABLED="/etc/nginx/sites-enabled/000-pznr-drop-default"
COMPOSE_DIR="${COMPOSE_DIR:-$APP_DIR}"
export PZNR_ENV_FILE="$ENV_FILE"
export PZNR_DOMAIN="$DOMAIN"
export PZNR_CORS_ORIGIN="https://${DOMAIN}"
export PZNR_LOG_DIR="$LOG_DIR"

ensureNginxProxySecret() {
    if [ -z "${PZNR_NGINX_PROXY_SECRET:-}" ] && [ -f "$ENV_FILE" ]; then
        PZNR_NGINX_PROXY_SECRET="$(grep '^PZNR_NGINX_PROXY_SECRET=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true)"
    fi
    if [ -z "${PZNR_NGINX_PROXY_SECRET:-}" ]; then
        PZNR_NGINX_PROXY_SECRET="$(openssl rand -hex 32 2>/dev/null || od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
        if [ -f "$ENV_FILE" ] && ! grep -q '^PZNR_NGINX_PROXY_SECRET=' "$ENV_FILE" 2>/dev/null; then
            echo "PZNR_NGINX_PROXY_SECRET=$PZNR_NGINX_PROXY_SECRET" >> "$ENV_FILE"
            echo "Added PZNR_NGINX_PROXY_SECRET to $ENV_FILE"
        fi
    fi
    export PZNR_NGINX_PROXY_SECRET
}

writeNginxDrop() {
    cat > "$NGINX_DROP" << 'NGINX_DROP_HTTP'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    access_log off;
    return 444;
}
NGINX_DROP_HTTP
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        cat >> "$NGINX_DROP" << NGINX_DROP_HTTPS
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;
    access_log off;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    return 444;
}
NGINX_DROP_HTTPS
    fi
    ln -sf "$NGINX_DROP" "$NGINX_DROP_ENABLED"
}

resetContainers() {
    echo "Stopping and removing containers in $APP_DIR (volumes preserved)."
    cd "$APP_DIR"
    docker compose down || true
}

resetContainersAndVolumes() {
    echo "NUCLEAR: stopping containers and removing volumes (database will be dropped)."
    cd "$APP_DIR"
    docker compose down -v || true
}

maybeResetBeforeRunAll() {
    cd "$APP_DIR"
    if [ "$DEPLOY_FLAG" = "--nuclear" ]; then
        resetContainersAndVolumes
    elif [ "$DEPLOY_FLAG" = "--quick" ]; then
        echo "Quick mode: skipping container reset."
    else
        resetContainers
    fi
}

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
    chown -R 33:33 "$LOG_DIR/backend"
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

makeMigrations() {
    VENV_PYTHON="$BACKEND_DIR/.venv/bin/python"
    if [ ! -x "$VENV_PYTHON" ]; then
        echo "WARNING: venv not found at $BACKEND_DIR/.venv — skipping host makemigrations."
        return 0
    fi
    echo "Generating migrations on host..."
    cd "$BACKEND_DIR"
    "$VENV_PYTHON" manage.py makemigrations documents partners processes 2>/dev/null || true
    cd "$APP_DIR"
}

copyBackendIntoContainer() {
    echo "Copying backend into container (no image build)..."
    cd "$APP_DIR"
    docker compose up -d postgres backend
    sleep 2
    cd "$BACKEND_DIR"
    tar cf - \
        --exclude='./.venv' \
        --exclude='./__pycache__' \
        --exclude='.pytest_cache' \
        --exclude='./media' \
        --exclude='./logs' \
        --exclude='./staticfiles' \
        --exclude='*.pyc' \
        . | docker compose exec -T backend tar xf - -C /app
    cd "$APP_DIR"
}

syncFrontendDist() {
    if [ ! -d "$FRONTEND_BUILD_DIR" ]; then
        echo "WARNING: $FRONTEND_BUILD_DIR not found — nginx keeps previous build (if any). Run setupDocker once or npm run build."
        return 0
    fi
    echo "Using host frontend dist at $FRONTEND_BUILD_DIR"
    chown -R www-data:www-data "$FRONTEND_BUILD_DIR" 2>/dev/null || true
}

reloadCodeDependantServices() {
    cd "$APP_DIR"
    echo "Restarting backend..."
    docker compose restart backend
    if nginx -t >/dev/null 2>&1; then
        systemctl reload nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
        echo "Nginx reloaded."
    fi
}

setupDockerQuick() {
    source "$ENV_FILE" 2>/dev/null || true
    export PZNR_DB_NAME="${PZNR_DB_NAME:-pznr}"
    export PZNR_DB_USER="${PZNR_DB_USER:-pznr_user}"
    export PZNR_DB_PASSWORD="${PZNR_DB_PASSWORD:-}"
    mkdir -p "$LOG_DIR/backend"
    chown -R 33:33 "$LOG_DIR/backend" 2>/dev/null || true
    makeMigrations
    copyBackendIntoContainer
    docker compose exec -T backend python manage.py migrate --noinput
    syncFrontendDist
    reloadCodeDependantServices
    echo "Quick deploy done: code copied, backend restarted, nginx reloaded (no docker/npm build)."
}

setupDocker() {
    source "$ENV_FILE" 2>/dev/null || true
    export PZNR_DB_NAME="${PZNR_DB_NAME:-pznr}"
    export PZNR_DB_USER="${PZNR_DB_USER:-pznr_user}"
    export PZNR_DB_PASSWORD="${PZNR_DB_PASSWORD:-}"
    mkdir -p "$LOG_DIR/backend"
    chown -R 33:33 "$LOG_DIR/backend" 2>/dev/null || true
    makeMigrations
    cd "$APP_DIR"
    docker compose build backend
    docker compose up -d postgres backend
    sleep 3
    rm -rf "$FRONTEND_BUILD_DIR"
    cd "$APP_DIR/frontend"
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        npm ci
        npm i
        npm audit fix || true
        VITE_API_BASE_URL="${API_BASE_URL}" npm run build
    else
        docker run --rm -v "$APP_DIR/frontend:/app" -w /app -e VITE_API_BASE_URL="${API_BASE_URL}" node:20-slim sh -c "rm -rf dist && npm ci && npm i && (npm audit fix || true) && npm run build"
    fi
    chown -R www-data:www-data "$FRONTEND_BUILD_DIR" 2>/dev/null || true
    cd "$APP_DIR"
    docker compose exec -T backend python manage.py migrate --noinput
    docker compose exec -T backend python manage.py collectstatic --noinput 2>/dev/null || true
    mkdir -p "$STATIC_DIR"
    docker compose cp backend:/app/staticfiles/. "$STATIC_DIR/"
    chown -R www-data:www-data "$STATIC_DIR" 2>/dev/null || true
    docker compose restart backend
}

setupNginx() {
    apt-get install -y nginx
    ensureNginxProxySecret
    mkdir -p "$(dirname "$NGINX_SITE")" "$LOG_DIR"
    writeNginxDrop
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
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        grep -q "listen 443" "$NGINX_SITE" 2>/dev/null || writeNginxSsl
    fi
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
        proxy_set_header X-Pznr-Proxy "$PZNR_NGINX_PROXY_SECRET";
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
        proxy_set_header X-Pznr-Proxy "$PZNR_NGINX_PROXY_SECRET";
        proxy_cookie_path / "/; HTTPOnly; Secure; SameSite=Lax";
    }
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Pznr-Proxy "$PZNR_NGINX_PROXY_SECRET";
        proxy_cookie_path / "/; HTTPOnly; Secure; SameSite=Lax";
    }
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Pznr-Proxy "$PZNR_NGINX_PROXY_SECRET";
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
        writeNginxDrop
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

setupLogrotate() {
    cat > /etc/logrotate.d/pznr << EOF
$LOG_DIR/*.log {
    weekly
    rotate 8
    compress
    missingok
    notifempty
    create 0640 root root
}
EOF
    echo "Logrotate configured for $LOG_DIR/*.log (weekly, 8 weeks retention)."
}

cleanLogs() {
    mkdir -p "$LOG_DIR/backend"
    echo "Cleaning logs under $LOG_DIR"
    find "$LOG_DIR" -mindepth 1 -type f -delete 2>/dev/null || true
    chown -R 33:33 "$LOG_DIR/backend" 2>/dev/null || true
    nginx -t >/dev/null 2>&1 && systemctl reload nginx 2>/dev/null || true
    if [ -f "$APP_DIR/docker-compose.yml" ]; then
        cd "$APP_DIR"
        if docker compose ps -q backend >/dev/null 2>&1; then
            docker compose exec -T backend sh -c \
                'truncate -s 0 /app/logs/*.log 2>/dev/null || true' 2>/dev/null || true
        fi
    fi
    echo "Logs cleaned."
}

setupTaskRunner() {
    mkdir -p "$LOG_DIR"
    TASK_SVC="/etc/systemd/system/pznr-run-due-processes.service"
    TASK_TMR="/etc/systemd/system/pznr-run-due-processes.timer"
    cat > "$TASK_SVC" << EOF
[Unit]
Description=PZNR process due checks (ensure open runs, ON_LEAD at 06:00)
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose exec -T backend python manage.py run_due_processes
StandardOutput=append:$LOG_DIR/run_due_processes.log
StandardError=append:$LOG_DIR/run_due_processes.log
User=root

[Install]
WantedBy=multi-user.target
EOF
    cat > "$TASK_TMR" << EOF
[Unit]
Description=Run PZNR due processes daily at 06:00
Requires=pznr-run-due-processes.service

[Timer]
OnCalendar=*-*-* 06:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
    SVC2="/etc/systemd/system/pznr-run-process-reminders.service"
    TMR2="/etc/systemd/system/pznr-run-process-reminders.timer"
    cat > "$SVC2" << EOF
[Unit]
Description=PZNR run process reminders (ON_SCHEDULED / ON_OVERDUE)
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose exec -T backend python manage.py run_process_reminders
StandardOutput=append:$LOG_DIR/run_process_reminders.log
StandardError=append:$LOG_DIR/run_process_reminders.log
User=root

[Install]
WantedBy=multi-user.target
EOF
    cat > "$TMR2" << EOF
[Unit]
Description=Run PZNR process reminders daily at 07:00
Requires=pznr-run-process-reminders.service

[Timer]
OnCalendar=*-*-* 07:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
    SVC3="/etc/systemd/system/pznr-process-ai-document-queue.service"
    TMR3="/etc/systemd/system/pznr-process-ai-document-queue.timer"
    cat > "$SVC3" << EOF
[Unit]
Description=PZNR process AI document queue (DocumentFileAIFormat PENDING)
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose exec -T backend python manage.py process_ai_document_queue
StandardOutput=append:$LOG_DIR/process_ai_document_queue.log
StandardError=append:$LOG_DIR/process_ai_document_queue.log
User=root

[Install]
WantedBy=multi-user.target
EOF
    cat > "$TMR3" << EOF
[Unit]
Description=Run PZNR AI document queue every 5 minutes
Requires=pznr-process-ai-document-queue.service

[Timer]
OnCalendar=*-*-* *:0/5:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
    systemctl daemon-reload
    systemctl enable pznr-run-due-processes.timer
    systemctl start pznr-run-due-processes.timer
    systemctl enable pznr-run-process-reminders.timer
    systemctl start pznr-run-process-reminders.timer
    systemctl enable pznr-process-ai-document-queue.timer
    systemctl start pznr-process-ai-document-queue.timer
    echo "Task runner: pznr-run-due-processes.timer (daily 06:00 — ON_LEAD checks), pznr-run-process-reminders.timer (daily 07:00), pznr-process-ai-document-queue.timer (every 5 min). Logs: $LOG_DIR/run_due_processes.log, $LOG_DIR/run_process_reminders.log, $LOG_DIR/process_ai_document_queue.log"
}

runAll() {
    maybeResetBeforeRunAll
    if [ "$CLEAN_LOGS" -eq 1 ]; then
        cleanLogs
    fi
    initialSetup
    setupDatabase
    if [ "$DEPLOY_FLAG" = "--quick" ]; then
        setupDockerQuick
    else
        setupDocker
    fi
    setupNginx
    setupSsl
    setupFirewall
    setupCron
    setupLogrotate
    setupTaskRunner
}

case "$DEPLOY_TARGET" in
    initialSetup)     initialSetup ;;
    setupDatabase)    setupDatabase ;;
    setupDocker)      setupDocker ;;
    setupDockerQuick) setupDockerQuick ;;
    setupNginx)       setupNginx ;;
    setupSsl)         setupSsl ;;
    setupFirewall)    setupFirewall ;;
    setupCron)        setupCron ;;
    setupLogrotate)   setupLogrotate ;;
    cleanLogs)        cleanLogs ;;
    setupTaskRunner)  setupTaskRunner ;;
    all)              runAll ;;
    *)                echo "Unknown target: $DEPLOY_TARGET. Use: initialSetup|setupDatabase|setupDocker|setupDockerQuick|setupNginx|setupSsl|setupFirewall|setupCron|setupLogrotate|cleanLogs|setupTaskRunner|all"; exit 1 ;;
esac

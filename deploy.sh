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
NGINX_MAX_BODY_SIZE="${NGINX_MAX_BODY_SIZE:-200M}"
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

readEnvVar() {
    local key="$1"
    local default="${2:-}"
    local val=""
    if [ -f "$ENV_FILE" ]; then
        val="$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true)"
    fi
    if [ -z "$val" ]; then
        val="$default"
    fi
    printf '%s' "$val"
}

loadBackendEnv() {
    export PZNR_DB_NAME="$(readEnvVar PZNR_DB_NAME pznr)"
    export PZNR_DB_USER="$(readEnvVar PZNR_DB_USER pznr_user)"
    export PZNR_DB_PASSWORD="$(readEnvVar PZNR_DB_PASSWORD "")"
    export PZNR_POSTGRES_PASSWORD="$(readEnvVar PZNR_POSTGRES_PASSWORD postgres)"
}

exportComposeEnv() {
    loadBackendEnv
    export PZNR_DB_NAME PZNR_DB_USER PZNR_DB_PASSWORD PZNR_POSTGRES_PASSWORD
}

escapeSqlLiteral() {
    printf "%s" "$1" | sed "s/'/''/g"
}

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

updateNginxClientMaxBodySize() {
    [ -f "$NGINX_SITE" ] || return 0
    if grep -q 'client_max_body_size' "$NGINX_SITE"; then
        sed -i "s/client_max_body_size [^;]*;/client_max_body_size $NGINX_MAX_BODY_SIZE;/" "$NGINX_SITE"
    elif grep -q 'listen 443 ssl' "$NGINX_SITE"; then
        sed -i "/listen 443 ssl;/a\\    client_max_body_size $NGINX_MAX_BODY_SIZE;" "$NGINX_SITE"
    fi
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

ensureSwap() {
    local size="${SWAP_SIZE:-2G}"
    local swapfile="${SWAP_FILE:-/swapfile}"
    local cur_kb
    cur_kb="$(awk '/SwapTotal/{print $2}' /proc/meminfo 2>/dev/null || echo 0)"
    if [ "${cur_kb:-0}" -ge 1048576 ]; then
        echo "Swap already present ($((cur_kb / 1024)) MB) — skipping."
        return 0
    fi
    if swapon --show=NAME --noheadings 2>/dev/null | grep -qx "$swapfile"; then
        echo "Swapfile $swapfile already active — skipping."
        return 0
    fi
    echo "Creating ${size} swap at ${swapfile}..."
    if ! fallocate -l "$size" "$swapfile" 2>/dev/null; then
        local mb
        case "$size" in
            *G) mb=$(( ${size%G} * 1024 )) ;;
            *M) mb=${size%M} ;;
            *) mb=2048 ;;
        esac
        dd if=/dev/zero of="$swapfile" bs=1M count="$mb" status=none
    fi
    chmod 600 "$swapfile"
    mkswap "$swapfile" >/dev/null
    swapon "$swapfile"
    if ! grep -q "^${swapfile} " /etc/fstab 2>/dev/null; then
        echo "${swapfile} none swap sw 0 0" >> /etc/fstab
    fi
    echo "Swap enabled:"
    free -h | awk '/Swap/{print}'
}

initialSetup() {
    ensureSwap
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
    exportComposeEnv
    if [ -z "$PZNR_DB_PASSWORD" ]; then
        echo "ERROR: PZNR_DB_PASSWORD is empty in $ENV_FILE" >&2
        exit 1
    fi
    local db_pass_sql
    db_pass_sql="$(escapeSqlLiteral "$PZNR_DB_PASSWORD")"
    cd "$APP_DIR"
    docker compose up -d postgres
    sleep 3
    if docker compose exec -T postgres psql -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname = '${PZNR_DB_USER}'" | grep -q 1; then
        docker compose exec -T postgres psql -U postgres -c "ALTER USER ${PZNR_DB_USER} WITH PASSWORD '${db_pass_sql}';"
    else
        docker compose exec -T postgres psql -U postgres -c "CREATE USER ${PZNR_DB_USER} WITH PASSWORD '${db_pass_sql}';"
    fi
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

invalidateTemplatePreviewCache() {
    cd "$APP_DIR"
    docker compose exec -T backend rm -rf /app/media/template_pages 2>/dev/null || true
    echo "Template preview cache invalidated (regenerates on next view)."
}

reloadCodeDependantServices() {
    cd "$APP_DIR"
    echo "Restarting backend..."
    docker compose restart backend
    invalidateTemplatePreviewCache
    updateNginxClientMaxBodySize
    if nginx -t >/dev/null 2>&1; then
        systemctl reload nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
        echo "Nginx reloaded."
    fi
}

setupDockerQuick() {
    exportComposeEnv
    mkdir -p "$LOG_DIR/backend"
    chown -R 33:33 "$LOG_DIR/backend" 2>/dev/null || true
    makeMigrations
    copyBackendIntoContainer
    docker compose exec -T backend python manage.py migrate --noinput
    syncFrontendDist
    reloadCodeDependantServices
    setupTaskRunner
    echo "Quick deploy done: code copied, backend restarted, nginx reloaded, timers refreshed (no docker/npm build)."
}

setupDocker() {
    exportComposeEnv
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
    docker compose exec -T backend python manage.py migrate --noinput < /dev/null
    docker compose exec -T backend python manage.py collectstatic --noinput < /dev/null 2>/dev/null || true
    mkdir -p "$STATIC_DIR"
    docker compose cp backend:/app/staticfiles/. "$STATIC_DIR/"
    chown -R www-data:www-data "$STATIC_DIR" 2>/dev/null || true
    docker compose restart backend
    invalidateTemplatePreviewCache
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
    updateNginxClientMaxBodySize
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
    client_max_body_size $NGINX_MAX_BODY_SIZE;
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
    location /intake/ {
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
    location = /index.html {
        root $FRONTEND_BUILD_DIR;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
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
Description=PZNR process due checks (ensure open runs at 06:00)
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
Description=PZNR run process reminders (notification outbox materialize + send)
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
Description=Run PZNR process reminders daily at 07:00 and 13:00
Requires=pznr-run-process-reminders.service

[Timer]
OnCalendar=*-*-* 07:00:00
OnCalendar=*-*-* 13:00:00
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
    SVC4="/etc/systemd/system/pznr-sync-company-registry.service"
    TMR4="/etc/systemd/system/pznr-sync-company-registry.timer"
    cat > "$SVC4" << EOF
[Unit]
Description=PZNR sync open-data company registry snapshot
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose exec -T backend python manage.py sync_company_registry
StandardOutput=append:$LOG_DIR/sync_company_registry.log
StandardError=append:$LOG_DIR/sync_company_registry.log
User=root

[Install]
WantedBy=multi-user.target
EOF
    cat > "$TMR4" << EOF
[Unit]
Description=Sync company registry monthly (7th day 03:00)
Requires=pznr-sync-company-registry.service

[Timer]
OnCalendar=*-*-07 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
    systemctl daemon-reload
    systemctl enable pznr-sync-company-registry.timer
    systemctl start pznr-sync-company-registry.timer
    echo "Task runner: pznr-run-due-processes.timer (daily 06:00), pznr-run-process-reminders.timer (daily 07:00 and 13:00), pznr-process-ai-document-queue.timer (every 5 min), pznr-sync-company-registry.timer (monthly 7th 03:00). Logs: $LOG_DIR/run_due_processes.log, $LOG_DIR/run_process_reminders.log, $LOG_DIR/process_ai_document_queue.log, $LOG_DIR/sync_company_registry.log"
}

seedFreshDatabase() {
    echo "NUCLEAR: seeding fresh database..."
    cd "$APP_DIR"
    docker compose exec -T backend python manage.py add_setup < /dev/null
    docker compose exec -T backend python manage.py reconcile_obligation_catalog < /dev/null
    docker compose exec -T backend python manage.py seed_default_test < /dev/null
    docker compose exec -T backend python manage.py seed_preliminary_users < /dev/null
    echo "Fresh database seeded (bogdan/anita/zoran — temp password MakSafety2026!)."
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
    if [ "$DEPLOY_FLAG" = "--nuclear" ]; then
        seedFreshDatabase
    fi
    setupNginx
    setupSsl
    setupFirewall
    setupCron
    setupLogrotate
    setupTaskRunner
}

case "$DEPLOY_TARGET" in
    ensureSwap)       ensureSwap ;;
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
    seedFreshDatabase) seedFreshDatabase ;;
    all)              runAll ;;
    *)                echo "Unknown target: $DEPLOY_TARGET. Use: ensureSwap|initialSetup|setupDatabase|setupDocker|setupDockerQuick|setupNginx|setupSsl|setupFirewall|setupCron|setupLogrotate|cleanLogs|setupTaskRunner|seedFreshDatabase|all"; exit 1 ;;
esac

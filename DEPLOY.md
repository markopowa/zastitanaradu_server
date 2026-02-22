## 1. Install git (if needed)

```bash
sudo apt-get update
sudo apt-get install -y git
```

## 2.

```bash
sudo mkdir -p /var/www
sudo chown "$USER:$USER" /var/www
cd /var/www
git clone https://github.com/YOUR_ORG/zastitanaradu_server.git
cd zastitanaradu_server
```

## 3. Create keys  (if needed)

```bash
ssh-keygen -t ed25519 -C "server-deploy" -f ~/.ssh/id_ed25519_deploy -N ""
cat ~/.ssh/id_ed25519_deploy.pub
```

---

## 4. Create config files on the server

**4.1 – deploy.conf**

From repo root (e.g. `/var/www/zastitanaradu_server`):

```bash
nano deploy.conf
```

- `APP_DIR` – directory that contains the repo (e.g. `/var/www/zastitanaradu_server`)
- `DOMAIN` – public hostname (e.g. `cuprija.pznr.in.rs`)
- `API_BASE_URL` – usually `https://<DOMAIN>`
- `ENV_FILE` – absolute path to `backend.env` (e.g. `/var/www/zastitanaradu_server/backend.env`)
- `LOG_DIR` – where logs go on the host (e.g. `/var/log/pznr`)

**4.2 – backend.env**

```bash
nano backend.env
```

- `PZNR_DB_PASSWORD` – strong password for DB user `pznr_user`
- `PZNR_POSTGRES_PASSWORD` – strong password for Postgres superuser (used by Docker)
- `DJANGO_SECRET_KEY` – long random string (e.g. `openssl rand -base64 48`)
- `PZNR_DOMAIN` – same as `DOMAIN` in deploy.conf
- `PZNR_CORS_ORIGIN` – same as `API_BASE_URL` (e.g. `https://cuprija.pznr.in.rs`)

**4.3 – Permissions**

```bash
chmod 600 backend.env
chmod 644 deploy.conf
```

---

## 5. Run the deploy script

```bash
cd /var/www/zastitanaradu_server
./deploy.sh ./deploy.conf all
```

1. **initialSetup** – Docker, docker compose, add your user to `www-data` and `docker`, create certbot webroot and log dir
2. **setupDatabase** – start Postgres container, create DB and user
3. **setupDocker** – build backend image, start postgres + backend, build frontend, run migrations and collectstatic
4. **setupNginx** – install nginx, write HTTP (80) vhost with redirect to HTTPS and ACME path
5. **setupSsl** – obtain Let’s Encrypt cert, append HTTPS (443) vhost, reload nginx
6. **setupFirewall** – UFW: allow 22, 80, 443; default deny
7. **setupCron** – Sunday midnight certbot renew + nginx reload

---

## 6. Run a single step (re-deploy or fix)

```bash
cd /var/www/zastitanaradu_server
./deploy.sh ./deploy.conf <step>
```

Steps: `initialSetup` | `setupDatabase` | `setupDocker` | `setupNginx` | `setupSsl` | `setupFirewall` | `setupCron`.

---

## 7. After deploy

- **App:** `https://<DOMAIN>` (e.g. `https://cuprija.pznr.in.rs`)
- **Logs (on host):**
  - Nginx: `$LOG_DIR/nginx-access.log`, `$LOG_DIR/nginx-error.log`
  - Backend: `$LOG_DIR/backend/access.log`, `$LOG_DIR/backend/error.log`, `$LOG_DIR/backend/django.log`
- **Containers:** `cd $APP_DIR && docker compose ps`
- **Backend only on localhost:** port 8000 is bound to `127.0.0.1`; only nginx is exposed on 80/443.

---

## 8. Quick reference

```bash
sudo apt-get update && sudo apt-get install -y git
sudo mkdir -p /var/www && sudo chown "$USER:$USER" /var/www
cd /var/www && git clone https://github.com/YOUR_ORG/zastitanaradu_server.git
cd zastitanaradu_server
nano deploy.conf
nano backend.env
./deploy.sh ./deploy.conf all
```

Replace the clone URL and fill in `deploy.conf` and `backend.env` before running the last line.

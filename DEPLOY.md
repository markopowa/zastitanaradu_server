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
- `DOMAIN` – public hostname (e.g. `mak-total-safety.pznr.in.rs`)
- `API_BASE_URL` – usually `https://<DOMAIN>`
- `ENV_FILE` – absolute path to `backend.env` (e.g. `/var/www/zastitanaradu_server/backend.env`)
- `LOG_DIR` – where logs go on the host (e.g. `/var/log/pznr`)
- `CERTBOT_DNS_MODE` – **`webroot` (default)** or `cloudflare`
- `CERTBOT_EMAIL` – email for Let’s Encrypt registration (recommended when using Cloudflare)
- `CLOUDFLARE_API_TOKEN_FILE` – path to Cloudflare DNS token file (used when `CERTBOT_DNS_MODE=cloudflare`, default `/root/.secrets/certbot/cloudflare.ini`)

**4.2 – backend.env**

```bash
nano backend.env
```

- `PZNR_DB_PASSWORD` – strong password for DB user `pznr_user`
- `PZNR_POSTGRES_PASSWORD` – strong password for Postgres superuser (used by Docker)
- `DJANGO_SECRET_KEY` – long random string (e.g. `openssl rand -base64 48`)
- `PZNR_DOMAIN` – same as `DOMAIN` in deploy.conf
- `PZNR_CORS_ORIGIN` – same as `API_BASE_URL` (e.g. `https://mak-total-safety.pznr.in.rs`)

**4.3 – Permissions**

```bash
chmod 600 backend.env
chmod 644 deploy.conf
```

---

## 4.4 – Cloudflare + Let’s Encrypt (recommended when proxied)

If your domain is on Cloudflare and you keep the orange cloud (proxy) enabled, use DNS-01 challenges so renewals don’t depend on HTTP passing through Cloudflare correctly.

**Step 1 – Cloudflare DNS**

- Create an `A` record for `DOMAIN` pointing to your server’s public IP.
- You can keep the record **proxied** (orange cloud) when using DNS-01.

**Step 2 – Create a Cloudflare API token**

- In the Cloudflare dashboard, create an API token with:
  - **Permissions**: `Zone > DNS > Edit`
  - **Zone resources**: restrict to the specific zone for `DOMAIN`.
- Copy the token value.

**Step 3 – Create the token file on the server**

```bash
sudo mkdir -p /root/.secrets/certbot
sudo nano /root/.secrets/certbot/cloudflare.ini
```

Put this content: paste your token value after the `=` with **no quotes** (not `"TOKEN"` or `'TOKEN'`, just the raw token).

```ini
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
```

Then lock down permissions:

```bash
sudo chmod 600 /root/.secrets/certbot/cloudflare.ini
```

**Step 4 – Wire it into deploy.conf**

In `deploy.conf`:

- `CERTBOT_DNS_MODE=cloudflare`
- `CERTBOT_EMAIL=you@example.com` (your email for Let’s Encrypt)
- `CLOUDFLARE_API_TOKEN_FILE=/root/.secrets/certbot/cloudflare.ini` (or your custom path)

With this setup:

- `deploy.sh` will use **Cloudflare DNS-01** for the initial certificate.
- The renew cron job is installed for **root** and uses the same DNS credentials.
- You can keep Cloudflare **proxy enabled** without breaking challenges.

**Test that certificate generation works (without issuing a real cert)**

From the server, with `deploy.conf` and the Cloudflare token file in place:

```bash
cd /var/www/zastitanaradu_server
source ./deploy.conf
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials "${CLOUDFLARE_API_TOKEN_FILE:-/root/.secrets/certbot/cloudflare.ini}" \
  -d "$DOMAIN" --dry-run
```

If that succeeds, run the real SSL step (issues the cert; skipped if a cert for `DOMAIN` already exists):

```bash
./deploy.sh ./deploy.conf setupSsl
```

---

## 5. Run the deploy script (safe to re-run)

```bash
cd /var/www/zastitanaradu_server
./deploy.sh ./deploy.conf all
```

This command is **idempotent** – you can safely run it again if something fails mid-way or after you fix a config issue.

1. **initialSetup** – install Docker if missing, configure Docker repo/key once, add your user to `www-data` and `docker`, create certbot webroot and log dir
2. **setupDatabase** – start Postgres container, create DB and user if they don’t exist yet
3. **setupDocker** – build backend image (with an idempotent `www-data` user creation in the Dockerfile), start postgres + backend, build frontend, run migrations and collectstatic
4. **setupNginx** – install nginx, write HTTP (80) vhost with redirect to HTTPS and ACME path
5. **setupSsl** – obtain Let’s Encrypt cert (skipped if one already exists for DOMAIN), append HTTPS (443) vhost, reload nginx
6. **setupFirewall** – UFW: allow 22, 80, 443; default deny
7. **setupCron** – install root cron: Sunday midnight `certbot renew` + nginx reload

---

## 6. Run a single step (re-deploy or fix; also safe to re-run)

```bash
cd /var/www/zastitanaradu_server
./deploy.sh ./deploy.conf <step>
```

Steps: `initialSetup` | `setupDatabase` | `setupDocker` | `setupNginx` | `setupSsl` | `setupFirewall` | `setupCron`.

- **You can re-run any step** after fixing config or code – the script checks existing state where needed (e.g. DB/user creation, SSL certs, cron) and uses idempotent operations (`mkdir -p`, `ufw allow`, `docker compose up -d`, Django `migrate`/`collectstatic`). If in doubt, just rerun the step.

---

## 7. After deploy

- **App:** `https://<DOMAIN>` (e.g. `https://mak-total-safety.pznr.in.rs`)
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

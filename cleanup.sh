set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"

load_env() {
  [ -f "$REPO_ROOT/backend.env" ] && set -a && . "$REPO_ROOT/backend.env" && set +a
  [ -f "$REPO_ROOT/deploy.conf" ] && set -a && . "$REPO_ROOT/deploy.conf" && set +a
  [ -f "$REPO_ROOT/.env" ]        && set -a && . "$REPO_ROOT/.env"        && set +a
}
load_env

DB_NAME="${PZNR_DB_NAME:-pznr}"
DB_USER="${PZNR_DB_USER:-pznr_user}"
DB_PASSWORD="${PZNR_DB_PASSWORD:-pznr_password}"
DB_HOST="${PZNR_DB_HOST:-localhost}"
DB_PORT="${PZNR_DB_PORT:-5432}"

export PGPASSWORD="$DB_PASSWORD"

echo "Cleaning database '$DB_NAME' on $DB_HOST:$DB_PORT (excluding users, roles, and Django tables)..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
DO
$$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'django_%'
          AND tablename NOT LIKE 'auth_%'
          AND tablename NOT LIKE 'account_%'
          AND tablename NOT LIKE 'socialaccount_%'
          AND tablename NOT ILIKE '%user%'
          AND tablename NOT ILIKE '%role%'
    LOOP
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE;', r.tablename);
    END LOOP;
END;
$$;
SQL

echo "Database cleanup completed."


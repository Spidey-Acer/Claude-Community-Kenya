#!/usr/bin/env bash
# Create a dedicated migration role on the PREVIEW database and point local
# Prisma at it.
#
# Why this exists: the `cck` role password is not recoverable. pg_hba requires
# scram-sha-256 for anything arriving over the Docker bridge, the container's
# POSTGRES_PASSWORD is a stale init value, and Vercel returns [SENSITIVE] for the
# real one. But pg_hba *trusts* the local socket inside the container, so we can
# create a new role there without needing any existing password.
#
# Scope: cck_preview ONLY. The prod database (`cck`) and the live app's existing
# credentials are untouched. The new role is not granted anything on prod.
#
# Run from the repo root:  bash scripts/dev-db-migrator-role.sh
set -euo pipefail

VPS=root@173.249.39.147
PGC=cck_postgres
LOCAL_PORT=15433
DB=cck_preview
ROLE=cck_migrator

command -v python >/dev/null 2>&1 || { echo "python not found on PATH"; exit 1; }

echo "1/5  generating a password for ${ROLE}…"
PW="$(python -c "import secrets;print(secrets.token_urlsafe(24))")"
echo "     ok — ${#PW} chars (not printed)"

echo "2/5  creating/updating the role on ${DB} via the trusted local socket…"
# The SQL is built locally and piped over ssh stdin. The password must not be a
# command-line argument: argv is visible in the VPS process list and in shell
# history. CREATEDB is required because `prisma migrate dev` provisions a shadow
# database; schema privileges let it run DDL against existing tables.
PGPASSWORD="$PW" python - "$ROLE" <<'PY' | ssh -o BatchMode=yes -o ConnectTimeout=10 "$VPS" \
    "docker exec -i ${PGC} psql -U cck -d ${DB} -v ON_ERROR_STOP=1 -q"
import os, sys
role = sys.argv[1]
# Single-quote escaping for a PostgreSQL string literal.
lit = "'" + os.environ["PGPASSWORD"].replace("'", "''") + "'"
print(f"""
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN
    ALTER ROLE {role} WITH LOGIN CREATEDB PASSWORD {lit};
  ELSE
    CREATE ROLE {role} WITH LOGIN CREATEDB PASSWORD {lit};
  END IF;
END
$do$;
GRANT ALL ON SCHEMA public TO {role};
GRANT ALL ON ALL TABLES IN SCHEMA public TO {role};
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO {role};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {role};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {role};
SELECT 'role ready' AS status;
""")
PY
echo "     ok"

echo "3/5  opening SSH tunnel localhost:${LOCAL_PORT} -> ${PGC}:5432…"
if ! (exec 3<>/dev/tcp/127.0.0.1/${LOCAL_PORT}) 2>/dev/null; then
  ssh -o BatchMode=yes -f -N -L ${LOCAL_PORT}:127.0.0.1:5433 "$VPS"
  sleep 2
  echo "     tunnel up"
else
  echo "     tunnel already up, reusing"
fi

echo "4/5  writing DATABASE_URL / DIRECT_URL…"
for f in .env .env.local; do
  if [ -f "$f" ] && [ ! -f "$f.backup-preshowcase" ]; then
    cp "$f" "$f.backup-preshowcase"; echo "     backed up $f"
  fi
done
PGPASSWORD="$PW" python - "$LOCAL_PORT" "$DB" "$ROLE" <<'PY'
import os, re, sys, pathlib, urllib.parse
port, db, user = sys.argv[1], sys.argv[2], sys.argv[3]
enc = urllib.parse.quote(os.environ["PGPASSWORD"], safe="")
url = f"postgresql://{user}:{enc}@127.0.0.1:{port}/{db}"
for name in (".env", ".env.local"):
    p = pathlib.Path(name)
    if not p.exists():
        continue
    t = p.read_text(encoding="utf-8")
    t = re.sub(r'^DATABASE_URL=.*$', f'DATABASE_URL="{url}"', t, flags=re.M)
    if re.search(r'^DIRECT_URL=', t, flags=re.M):
        t = re.sub(r'^DIRECT_URL=.*$', f'DIRECT_URL="{url}"', t, flags=re.M)
    else:
        t = t.rstrip() + f'\nDIRECT_URL="{url}"\n'
    p.write_text(t, encoding="utf-8")
    print(f"     rewrote {name}")
PY

echo
echo "5/5  verifying…"
npx prisma migrate status 2>&1 | tail -8
echo
echo "Tunnel: pkill -f '${LOCAL_PORT}:127.0.0.1:5433' to close."

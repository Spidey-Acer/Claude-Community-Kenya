#!/usr/bin/env bash
# Point local Prisma at the cck_preview database on the VPS.
#
# Postgres (cck_postgres) binds only to 127.0.0.1:5433 on the box; the public
# ports are pgbouncer. Prisma migrations need a direct, non-pooled connection —
# pgbouncer in transaction mode breaks advisory locks and DDL — so this opens an
# SSH tunnel to the real Postgres port.
#
# `POSTGRES_PASSWORD` in the container is the *init* password and can be stale if
# the role password was changed later with ALTER ROLE. pgbouncer's own DB_PASSWORD
# is what actually authenticates today, so we test each candidate over TCP inside
# the box and use whichever works. Nothing is ever echoed.
#
# Run from the repo root:  bash scripts/dev-db-connect.sh
set -euo pipefail

VPS=root@173.249.39.147
PGC=cck_postgres
LOCAL_PORT=15433
DB=cck_preview
USER=cck

command -v python >/dev/null 2>&1 || { echo "python not found on PATH"; exit 1; }

# Escape hatch: reuse the password out of a DATABASE_URL in a file you already
# have (e.g. one written by `vercel env pull`). Skips the VPS candidate search.
if [ -n "${PW_FROM:-}" ]; then
  [ -f "$PW_FROM" ] || { echo "PW_FROM=$PW_FROM does not exist"; exit 1; }
  PW="$(python - "$PW_FROM" <<'PY'
import re, sys, urllib.parse, pathlib
t = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
m = re.search(r'^DATABASE_URL\s*=\s*"?([^"\n]+)"?', t, flags=re.M)
if not m: sys.exit("no DATABASE_URL in that file")
print(urllib.parse.unquote(urllib.parse.urlsplit(m.group(1)).password or ""))
PY
)"
  [ -n "$PW" ] || { echo "could not extract a password from $PW_FROM"; exit 1; }
  echo "1/5  using password extracted from $PW_FROM (${#PW} chars, not printed)"
  SOURCE=skip
else
echo "1/5  finding a password that actually authenticates…"
# Prints only the WINNING SOURCE LABEL, never a value.
SOURCE="$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$VPS" bash -s <<'REMOTE'
set -uo pipefail
# Must NOT test from inside cck_postgres: pg_hba trusts 127.0.0.1/32, so any
# password "passes" there. Testing from the host through the published port sends
# the connection via docker-proxy, so Postgres sees the bridge address and applies
# `host all all all scram-sha-256` — the same path the SSH tunnel will use.
try() { # $1=label  $2=password
  [ -n "${2:-}" ] || return 1
  docker run --rm --network host -e PGPASSWORD="$2" postgres:17-alpine \
    psql -h 127.0.0.1 -p 5433 -U cck -d cck_preview -tAc "select 1" \
    >/dev/null 2>&1 || return 1
  echo "$1"; return 0
}
BOUNCER_PREVIEW="$(docker exec cck_pgbouncer_preview printenv DB_PASSWORD 2>/dev/null || true)"
BOUNCER_PROD="$(docker exec cck_pgbouncer printenv DB_PASSWORD 2>/dev/null || true)"
PGENV="$(docker exec cck_postgres printenv POSTGRES_PASSWORD 2>/dev/null || true)"
try bouncer_preview "$BOUNCER_PREVIEW" && exit 0
try bouncer_prod    "$BOUNCER_PROD"    && exit 0
try postgres_env    "$PGENV"           && exit 0
echo NONE
REMOTE
)"
SOURCE="$(printf %s "$SOURCE" | tr -d '\r\n' | tail -c 32)"

if [ "$SOURCE" = "NONE" ] || [ -z "$SOURCE" ]; then
  cat <<'MSG'
     FAILED: none of the candidate passwords authenticate as 'cck' over scram.

     Fall back to the credentials the live app actually uses:

       npx vercel env pull .env.preview --environment=preview

     That writes the working DATABASE_URL (pointing at pgbouncer :6433).
     Then re-run this script with that file as the password source:

       PW_FROM=.env.preview bash scripts/dev-db-connect.sh
MSG
  exit 1
fi
echo "     ok — using password from: $SOURCE"

echo "2/5  retrieving it…"
case "$SOURCE" in
  bouncer_preview) REMOTE_CMD="docker exec cck_pgbouncer_preview printenv DB_PASSWORD" ;;
  bouncer_prod)    REMOTE_CMD="docker exec cck_pgbouncer printenv DB_PASSWORD" ;;
  postgres_env)    REMOTE_CMD="docker exec ${PGC} printenv POSTGRES_PASSWORD" ;;
esac
PW="$(ssh -o BatchMode=yes "$VPS" "$REMOTE_CMD" | tr -d '\r\n')"
[ -n "$PW" ] || { echo "     FAILED: empty password"; exit 1; }
echo "     ok — ${#PW} chars (not printed)"
fi

echo "3/5  opening SSH tunnel localhost:${LOCAL_PORT} -> ${PGC}:5432…"
if ! (exec 3<>/dev/tcp/127.0.0.1/${LOCAL_PORT}) 2>/dev/null; then
  ssh -o BatchMode=yes -f -N -L ${LOCAL_PORT}:127.0.0.1:5433 "$VPS"
  sleep 2
  echo "     tunnel up"
else
  echo "     tunnel already up, reusing"
fi

echo "4/5  backing up .env files…"
for f in .env .env.local; do
  if [ -f "$f" ] && [ ! -f "$f.backup-preshowcase" ]; then
    cp "$f" "$f.backup-preshowcase"; echo "     $f -> $f.backup-preshowcase"
  fi
done

echo "5/5  rewriting DATABASE_URL / DIRECT_URL…"
PGPASSWORD="$PW" python - "$LOCAL_PORT" "$DB" "$USER" <<'PY'
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
echo "Verifying…"
npx prisma migrate status 2>&1 | tail -6
echo
echo "Tunnel runs in the background. Close it with:  pkill -f '${LOCAL_PORT}:127.0.0.1:5433'"

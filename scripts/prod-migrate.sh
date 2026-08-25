#!/usr/bin/env bash
# Apply pending Prisma migrations to the PRODUCTION database (cck).
#
# Vercel cannot do this. Its build is `prisma generate && next build`, and a
# Vercel builder cannot reach Postgres at all: it binds to 127.0.0.1:5433 on the
# VPS, and the public ports are pgbouncer in transaction mode, which breaks
# migrations. So migrations are applied from here, over an SSH tunnel.
#
# ORDER MATTERS. Run this BEFORE the code deploys. Prisma selects every scalar
# column it knows about, so code built against the new schema queries columns
# that do not exist yet — deploying first breaks pages that work today.
#
# Dry run by default: prints exactly what would be applied and changes nothing.
# Pass --yes to actually apply.
#
#   bash scripts/prod-migrate.sh          # show the plan
#   bash scripts/prod-migrate.sh --yes    # apply it
set -euo pipefail

APPLY=no
[ "${1:-}" = "--yes" ] && APPLY=yes

VPS=root@173.249.39.147
PGC=cck_postgres
LOCAL_PORT=15433
DB=cck
ROLE=cck_migrator

command -v python >/dev/null 2>&1 || { echo "python not found on PATH"; exit 1; }

echo "Target: ${DB} (PRODUCTION) on ${VPS}"
echo

echo "1/6  tunnel…"
if ! (exec 3<>/dev/tcp/127.0.0.1/${LOCAL_PORT}) 2>/dev/null; then
  ssh -o BatchMode=yes -f -N -L ${LOCAL_PORT}:127.0.0.1:5433 "$VPS"
  sleep 2
  echo "     opened"
else
  echo "     already up"
fi

echo "2/6  ensuring the ${ROLE} role exists on ${DB}…"
# Created through the container's local socket, which pg_hba trusts — the `cck`
# role password is not recoverable and is not needed for this.
PW="$(python -c "import secrets;print(secrets.token_urlsafe(24))")"
PGPASSWORD="$PW" python - "$ROLE" <<'PY' | ssh -o BatchMode=yes "$VPS" \
    "docker exec -i ${PGC} psql -U cck -d ${DB} -v ON_ERROR_STOP=1 -q"
import os, sys
role = sys.argv[1]
lit = "'" + os.environ["PGPASSWORD"].replace("'", "''") + "'"
print(f"""
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN
    ALTER ROLE {role} WITH LOGIN PASSWORD {lit};
  ELSE
    CREATE ROLE {role} WITH LOGIN PASSWORD {lit};
  END IF;
END
$do$;
-- Owning the existing objects is required to ALTER them. GRANT rather than
-- reassigning ownership, so `cck` remains the owner of everything.
GRANT cck TO {role};
GRANT ALL ON SCHEMA public TO {role};
SELECT 'role ready' AS status;
""")
PY
echo "     ok"

export DATABASE_URL="$(PGPASSWORD="$PW" python -c "
import os, urllib.parse
print('postgresql://${ROLE}:' + urllib.parse.quote(os.environ['PGPASSWORD'], safe='') + '@127.0.0.1:${LOCAL_PORT}/${DB}')
")"
export DIRECT_URL="$DATABASE_URL"

echo "3/6  what is pending:"
# `migrate status` exits non-zero whenever anything is pending, which is the
# normal case here — without the guard, `set -e` kills the script before it
# prints anything.
npx prisma migrate status 2>&1 | tail -20 || true
echo

if [ "$APPLY" != "yes" ]; then
  echo "DRY RUN — nothing was changed."
  echo "Re-run with --yes to apply the migrations listed above to PRODUCTION."
  exit 0
fi

echo
echo "4/6  applying…"
npx prisma migrate deploy 2>&1 | tail -12

echo
echo "5/6  verifying schema…"
# Piped over stdin rather than embedded in the ssh argument: the quoting needed
# for "voterKey" through two shells is easy to get subtly wrong.
ssh -o BatchMode=yes "$VPS" "docker exec -i ${PGC} psql -U cck -d ${DB} -tA" <<'SQL'
SELECT 'showcase tables (want 2): ' || count(*) FROM information_schema.tables
 WHERE table_name IN ('showcase_reactions','content_reports');
SELECT 'new submission columns (want 8): ' || count(*) FROM information_schema.columns
 WHERE table_name='community_submissions'
   AND column_name IN ('coverImageUrl','media','eventId','needs','builtWith',
                       'lastActivityAt','followerCount','reactionCounts');
SELECT 'upvotes total/keyed (want equal): ' || count(*) || '/' || count("voterKey")
  FROM community_upvotes;
SELECT 'community submissions still present: ' || count(*) FROM community_submissions;
SQL

echo
echo "6/6  done. Deploy the code now — until it ships, upvotes will fail:"
echo "     the new voterKey column is NOT NULL and the running build does not set it."

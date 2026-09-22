#!/bin/sh
set -e
# Runs Prisma migrations (if DATABASE_URL is set) then starts the API.
# Migration failure is fatal: never serve traffic with an unmigrated schema.
if [ -n "$DATABASE_URL" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma || {
    echo "ERROR: prisma migrate deploy failed (refusing to start API)" >&2
    exit 1
  }
else
  echo "DATABASE_URL not set; skipping migrations"
fi
exec "$@"

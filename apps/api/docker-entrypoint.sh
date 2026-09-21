#!/bin/sh
set -e
# Runs Prisma migrations (if DATABASE_URL is set) then starts the API.
# Never fail the container on migration errors in a way that hides logs.
if [ -n "$DATABASE_URL" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma || {
    echo "WARNING: prisma migrate deploy failed (continuing to start API)" >&2
  }
else
  echo "DATABASE_URL not set; skipping migrations"
fi
exec "$@"

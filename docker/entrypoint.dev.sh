#!/bin/sh
set -e

echo "Running database migrations..."
pnpm db:migration:run

if [ -n "$ADMIN_PASSWORD" ]; then
  echo "Seeding admin user..."
  pnpm db:seed
else
  echo "ADMIN_PASSWORD not set - skipping admin seed."
fi

echo "Starting development server..."
exec pnpm start:dev

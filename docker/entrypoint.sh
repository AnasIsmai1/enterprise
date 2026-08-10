#!/bin/sh
set -e

# Migrations must run before the app boots — synchronize is false everywhere, so
# without this step the schema simply does not exist.
echo "Running database migrations..."
node ./node_modules/typeorm/cli.js migration:run -d dist/shared/config/typeorm.datasource.js

if [ -n "$ADMIN_PASSWORD" ]; then
  echo "Seeding admin user..."
  node dist/seeds/index.js
else
  echo "ADMIN_PASSWORD not set - skipping admin seed."
fi

echo "Starting production server..."
exec node dist/main

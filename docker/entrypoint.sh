#!/bin/sh
set -e

echo "Running database seed..."
npm run db:seed

echo "Starting production server..."
exec node dist/main

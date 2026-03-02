#!/bin/sh
set -e

echo "Running database seed..."
npm run db:seed

echo "Starting development server..."
exec npm run start:dev

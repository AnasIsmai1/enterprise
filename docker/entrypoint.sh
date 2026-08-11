#!/bin/sh
set -e

# Swarm secrets arrive as files, not env vars. Export FOO from FOO_FILE so the
# app keeps reading process.env and needs no _FILE awareness of its own.
for var in DB_PASS BETTER_AUTH_SECRET BREVO_API_KEY ADMIN_PASSWORD; do
  eval "file=\${${var}_FILE:-}"
  if [ -n "$file" ] && [ -r "$file" ]; then
    eval "export ${var}=\"\$(cat \"\$file\")\""
  fi
done

# NOTE: migrations deliberately do NOT run here.
#
# This service runs with replicas > 1 under Swarm, and TypeORM takes no advisory
# lock — two tasks starting together would race `migration:run` and leave the
# migrations table half-applied. Migrations are a deliberate pre-deploy step:
#
#   pnpm deploy              (see scripts/deploy.sh — migrates, then rolls out)
#
# Because old and new code run simultaneously during a rolling update, every
# migration must also be backward-compatible. See docs/MIGRATIONS_AND_DOCKER.md.

exec node dist/main

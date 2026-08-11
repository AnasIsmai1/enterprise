#!/usr/bin/env sh
# Deploy to a single-node Docker Swarm.
#
#   ./scripts/deploy.sh                 # migrate, then roll out
#   ./scripts/deploy.sh --skip-migrate  # roll out only
#
# Ordering is the whole point: migrations complete BEFORE any new task starts,
# and they run exactly once rather than racing across replicas.
set -eu

STACK_NAME="${STACK_NAME:-enterprise}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/stack.yaml}"
ENV_FILE="${ENV_FILE:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "error: $ENV_FILE not found. Copy .env.example and fill it in." >&2
  exit 1
fi

if ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q active; then
  echo "error: this node is not in a swarm. Run: docker swarm init" >&2
  exit 1
fi

if [ "${1:-}" != "--skip-migrate" ]; then
  echo "==> Running migrations (once, before rollout)"
  # Runs on the deploy host against the managed database, using the same image
  # that is about to ship — so the migration set matches the code exactly.
  set -a
  # shellcheck disable=SC1090
  . "./$ENV_FILE"
  set +a

  docker run --rm \
    --env-file "$ENV_FILE" \
    "${APP_IMAGE:?APP_IMAGE must be set in $ENV_FILE}" \
    node ./node_modules/typeorm/cli.js migration:run \
      -d dist/shared/config/typeorm.datasource.js
fi

echo "==> Deploying stack '$STACK_NAME'"
# Pre-render through `docker compose config` so env_file and ${VAR} interpolation
# resolve identically regardless of how this Docker CLI version treats them under
# `stack deploy`. Written to a temp file because `-c` takes a path, and POSIX sh
# has no process substitution.
RENDERED="$(mktemp)"
# shellcheck disable=SC2064
trap "rm -f '$RENDERED'" EXIT INT TERM

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config > "$RENDERED"

# Two incompatibilities between what `docker compose config` emits and what
# `docker stack deploy` accepts. Both make the very first deploy fail:
#
#   1. Ports are emitted as quoted strings -> "published must be a integer".
#   2. A top-level `name:` (the compose project name) is injected, and the
#      stack schema rejects it -> "(root) Additional property name is not allowed".
sed -i.bak -E 's/^([[:space:]]*(published|target)): "([0-9]+)"$/\1: \3/' "$RENDERED"
sed -i.bak -E '/^name: /d' "$RENDERED"
rm -f "${RENDERED}.bak"

docker stack deploy \
  --detach=false \
  --with-registry-auth \
  -c "$RENDERED" \
  "$STACK_NAME"

echo "==> Rollout status"
docker service ps --no-trunc "${STACK_NAME}_app"

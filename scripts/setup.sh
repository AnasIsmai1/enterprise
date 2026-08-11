#!/bin/sh

set -e

if [ -d "node_modules" ]; then
  echo "node_modules directory already exists. Skipping pnpm install."
else
  echo "Installing Node.js dependencies..."
  pnpm install
fi

if [ -f ".env" ]; then
  echo ".env file already exists. Skipping copy."
else
  if [ -f ".env.example" ]; then
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo "Please review and update .env with your configuration."
  else
    echo "Warning: .env.example not found. Please create .env manually."
  fi
fi

echo "Checking for Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Please install Docker before continuing."
  exit 1
fi

echo "Checking for Docker Compose..."
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is not available. Please install Docker Compose v2 (docker compose)."
  exit 1
fi

echo "Checking Docker daemon status..."
if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Please start Docker."
  exit 1
fi

echo "Setup complete!"

# This script bootstraps local development only. Production is a Docker Swarm
# stack deployed by scripts/deploy.sh, which must run migrations before the
# rollout — `compose up` cannot express that ordering.
if [ "$1" = "prod" ]; then
  echo "Production is not deployed with this script." >&2
  echo "Use 'pnpm deploy' (docker/stack.yaml). See docs/DEPLOYMENT.md." >&2
  exit 1
fi

echo "Building development stack using docker/docker-compose.dev.yaml"
docker compose -f docker/docker-compose.dev.yaml up --build -d

echo "Docker Compose build finished."
echo "Start the project with:"
echo "  pnpm docker:up:dev   # everything in containers"
echo "  pnpm start:dev       # app on the host, Postgres and Redis in Docker"

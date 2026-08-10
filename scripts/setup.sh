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

echo "Building Docker Compose stack..."
if [ "$1" = "prod" ]; then
  echo "Building production stack using docker/docker-compose.prod.yaml"
  docker compose -f docker/docker-compose.prod.yaml up --build -d
else
  echo "Building development stack using docker/docker-compose.dev.yaml"
  docker compose -f docker/docker-compose.dev.yaml up --build -d
fi

echo "Docker Compose build finished."

if [ -n "$SHELL" ] || [ -n "$TERM_PROGRAM" ] || [ -n "$WT_SESSION" ]; then
  echo "You are running in a Unix-like or modern terminal."
  echo "You can now start the project with:"
  echo "  pnpm docker:up:dev"
  echo "or"
  echo "  pnpm docker:up:prod"
else
  echo "You may be running in a basic terminal."
  echo "For best results, use a Unix-like shell or modern terminal."
  echo "Then start the project with:"
  echo "  pnpm docker:up:dev"
  echo "or"
  echo "  pnpm start:dev"
fi

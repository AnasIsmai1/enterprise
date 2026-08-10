# Migrations and Docker Setup Guide

This document explains how to work with database migrations and Docker in this project.

---

## Table of Contents

- [Database Migrations](#database-migrations)
  - [Overview](#overview)
  - [Migration Commands](#migration-commands)
  - [Creating Migrations](#creating-migrations)
  - [Running Migrations](#running-migrations)
  - [Reverting Migrations](#reverting-migrations)
  - [Migration Best Practices](#migration-best-practices)
- [Docker Setup](#docker-setup)
  - [Architecture](#architecture)
  - [Development Environment](#development-environment)
  - [Production Environment](#production-environment)
  - [Docker Commands](#docker-commands)
  - [Environment Variables](#environment-variables)
  - [Troubleshooting](#troubleshooting)

---

## Database Migrations

### Overview

This project uses **TypeORM** for database migrations. Migrations are version-controlled database schema changes that allow you to:

- Track schema changes over time
- Deploy consistent database schemas across environments
- Rollback changes if needed
- Collaborate on schema changes with your team

**Key files:**
- `src/shared/config/typeorm.datasource.ts` - TypeORM CLI configuration
- `src/migrations/` - Migration files directory

### Migration Commands

| Command | Description |
|---------|-------------|
| `pnpm db:migration:create` | Create a blank migration file |
| `pnpm db:migration:generate` | Auto-generate migration from entity changes |
| `pnpm db:migration:run` | Run all pending migrations |
| `pnpm db:migration:revert` | Revert the last executed migration |

### Creating Migrations

#### Option 1: Auto-generate from Entity Changes (Recommended)

When you modify an entity, TypeORM can automatically generate the migration SQL:

```bash
# 1. Make changes to your entity files (e.g., add a new column)

# 2. Build the project first (required for TypeORM CLI)
pnpm build

# 3. Generate migration with a descriptive name (path is automatic)
pnpm db:migration:generate AddUserPhoneNumber
```

This creates a timestamped migration file like:
```
src/migrations/1704067200000-AddUserPhoneNumber.ts
```

#### Option 2: Create Blank Migration

For complex changes that can't be auto-generated:

```bash
pnpm db:migration:create SeedInitialRoles
```

Then manually write the `up()` and `down()` methods.

#### Migration File Structure

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPhoneNumber1704067200000 implements MigrationInterface {
  name = 'AddUserPhoneNumber1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Changes to apply
    await queryRunner.query(`
      ALTER TABLE "users" ADD "phone" varchar(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // How to revert the changes
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "phone"
    `);
  }
}
```

### Running Migrations

```bash
# Run all pending migrations
pnpm db:migration:run
```

Migrations are tracked in the `migrations` table. Only migrations that haven't been executed will run.

### Reverting Migrations

```bash
# Revert the last migration
pnpm db:migration:revert

# Revert multiple migrations (run multiple times)
pnpm db:migration:revert
pnpm db:migration:revert
```

### Migration Best Practices

1. **Always generate migrations** - Never use `synchronize: true` in production
2. **Test migrations locally** - Run both `up` and `down` before committing
3. **Use descriptive names** - `AddUserEmailVerification` not `Update1`
4. **Keep migrations small** - One logical change per migration
5. **Never modify executed migrations** - Create new ones instead
6. **Backup before running** - Especially in production

#### Example Workflow

```bash
# 1. Create/modify entity
# Edit src/modules/user/core/entities/user.entity.ts

# 2. Build project
pnpm build

# 3. Generate migration (just pass the name)
pnpm db:migration:generate AddUserStatus

# 4. Review the generated migration file

# 5. Run migration
pnpm db:migration:run

# 6. Test the rollback
pnpm db:migration:revert

# 7. Re-run and commit
pnpm db:migration:run
git add src/migrations/
git commit -m "Add user status column"
```

---

## Docker Setup

### Architecture

The project uses a multi-stage Docker build with three stages:

```
┌─────────────────────────────────────────────────────────┐
│  Stage 1: deps                                          │
│  - Base: node:20-alpine                                 │
│  - Installs all dependencies                        │
│  - Cached for faster rebuilds                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Stage 2: build                                         │
│  - Copies source code                                   │
│  - Compiles TypeScript to JavaScript                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Stage 3: run (Production only)                         │
│  - Minimal image with only production files             │
│  - Non-root user (nestjs:1001)                          │
│  - dumb-init for proper signal handling                 │
└─────────────────────────────────────────────────────────┘
```

### Development Environment

**Files:**
- `docker/Dockerfile.dev` - Development Dockerfile
- `docker/docker-compose.dev.yaml` - Development compose configuration
- `docker/entrypoint.dev.sh` - Development entrypoint script

**Services:**
| Service | Port | Description |
|---------|------|-------------|
| app | 5500 | NestJS application (hot reload) |
| postgres | 5432 | PostgreSQL 16 database |
| redis | 6379 | Redis 7 cache |

**Features:**
- Hot reload via volume mounts
- Source code synced to container
- Auto-rebuild on package.json changes
- Interactive terminal (stdin/tty)

### Production Environment

**Files:**
- `docker/Dockerfile` - Production Dockerfile (multi-stage)
- `docker/docker-compose.yaml` - Production compose configuration
- `docker/entrypoint.sh` - Production entrypoint script

**Features:**
- Minimal image size (~200MB vs ~800MB dev)
- Non-root user for security
- Health checks on all services
- Resource limits (memory/CPU)
- Automatic restart on failure
- Runs database seeds on startup

### Docker Commands

#### Development

```bash
# Start all services
pnpm docker:up:dev

# Start with rebuild
pnpm docker:build:dev && pnpm docker:up:dev

# Start with file watching (recommended)
pnpm docker:watch:dev

# View logs
pnpm docker:logs:dev

# Check service status
pnpm docker:status:dev

# Stop all services
pnpm docker:down:dev

# Stop and remove volumes (clean slate)
pnpm docker:clean:dev
```

#### Production

```bash
# Build production image
pnpm docker:build:prod

# Start in detached mode
pnpm docker:up:prod

# View logs
pnpm docker:logs:prod

# Check service status
pnpm docker:status:prod

# Restart services
pnpm docker:restart:prod

# Stop services
pnpm docker:down:prod

# Stop and remove volumes
pnpm docker:clean:prod
```

### Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

**Required variables:**

```env
# App
NODE_ENV=development
PORT=5500

# Database
DB_HOST=localhost      # Use 'postgres' when running in Docker
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=enterprise
DB_SSL=false

# Redis
REDIS_HOST=localhost   # Use 'redis' when running in Docker
REDIS_PORT=6379

# Auth
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

**Note:** When running with Docker Compose, the `DB_HOST` and `REDIS_HOST` are automatically overridden to use the container service names (`postgres` and `redis`).

### Troubleshooting

#### Container won't start

```bash
# Check logs
docker compose -f docker/docker-compose.dev.yaml logs app

# Check if ports are in use
lsof -i :5500
lsof -i :5432
lsof -i :6379
```

#### Database connection issues

```bash
# Verify postgres is healthy
docker compose -f docker/docker-compose.dev.yaml ps

# Connect to postgres directly
docker exec -it enterprise_postgres_dev psql -U postgres -d enterprise
```

#### Permission issues

```bash
# Reset volumes
pnpm docker:clean:dev

# Rebuild from scratch
docker compose -f docker/docker-compose.dev.yaml build --no-cache
```

#### Hot reload not working

1. Ensure you're using `docker:watch:dev` not `docker:up:dev`
2. Check that `src/` is properly mounted in the container
3. Verify file changes are syncing:

```bash
docker exec -it enterprise_app_dev ls -la /app/src
```

#### Out of memory

Increase Docker's memory limit in Docker Desktop settings, or adjust the compose file limits:

```yaml
deploy:
  resources:
    limits:
      memory: 2G  # Increase from 1G
```

---

## Quick Reference

### Daily Development Workflow

```bash
# 1. Start development environment
pnpm docker:watch:dev

# 2. Make code changes (hot reload active)

# 3. If you change entities, generate migration
pnpm build
pnpm db:migration:generate YourMigrationName

# 4. Run migration
pnpm db:migration:run

# 5. Stop when done
pnpm docker:down:dev
```

### Deployment Workflow

```bash
# 1. Build production image
pnpm docker:build:prod

# 2. Run migrations (if any)
pnpm db:migration:run

# 3. Start production
pnpm docker:up:prod

# 4. Verify health
curl http://localhost:5500/health
```

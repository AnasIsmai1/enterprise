# Enterprise API

A general-purpose NestJS backend boilerplate: better-auth identity with multi-tenant organizations and invitations, PostgreSQL, Redis, and Docker support.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 22 (engines: >= 20.12) |
| Framework | NestJS 11 |
| Language | TypeScript 5.9 |
| Compiler | SWC (build + tests) |
| Database | PostgreSQL 16 |
| ORM | TypeORM 0.3 — plus Kysely, which better-auth uses for its own tables |
| Cache / queue | Redis 7 — sessions, rate limits, BullMQ broker |
| Jobs | BullMQ |
| Auth | better-auth (sessions, organizations, invitations) |
| Authorization | `@Roles()` (app) + `@OrgRoles()` (per-organization) |
| Rate limiting | @nestjs/throttler, Redis-backed |
| Logging | pino (nestjs-pino) |
| Errors | Sentry |
| Email | Brevo, queued through BullMQ |
| Storage | Cloudflare R2 (S3 API) |
| Health | @nestjs/terminus |
| Validation | class-validator |
| Documentation | Swagger/OpenAPI at `/api/docs` |
| Containerization | Docker Compose (dev) + Docker Swarm (prod) |

---

## Quick Start

### Prerequisites

- Node.js >= 20.12 (22 recommended — containers and CI use 22)
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Option 1: Docker (Recommended)

```bash
# 1. Clone and navigate to project
cd enterprise

# 2. Copy environment file
cp .env.example .env

# 3. Start all services with hot reload
pnpm docker:watch:dev

# 4. API is available at http://localhost:5500
```

### Option 2: Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your database/redis connection details

# 3. Run database migrations
pnpm db:migration:run

# 4. Seed the database
pnpm db:seed

# 5. Start development server
pnpm start:dev

# API is available at http://localhost:5500
```

---

## Project Structure

```
enterprise/
├── docker/
│   ├── Dockerfile              # Production, 4-stage, non-root
│   ├── Dockerfile.dev          # Development, hot reload
│   ├── docker-compose.dev.yaml # Dev stack: app + postgres + redis
│   ├── stack.yaml              # Production Swarm stack (no postgres — managed)
│   ├── Caddyfile               # TLS termination, reverse proxy
│   ├── entrypoint.sh           # Prod: secrets shim, then start
│   └── entrypoint.dev.sh       # Dev: migrate, seed, then start
├── docs/
│   ├── AUTH.md                 # Auth surface, transports, guards
│   ├── TENANCY.md              # Org-scoping rules for new resources
│   ├── DEPLOYMENT.md           # Swarm runbook
│   ├── MIGRATIONS_AND_DOCKER.md
│   ├── AUDIT.md                # What was found and fixed
│   └── BACKLOG.md
├── scripts/
│   ├── setup.sh                # Initial project setup
│   ├── module-setup.sh         # Module scaffolding
│   ├── deploy.sh               # Migrate + rolling deploy
│   ├── print-auth-sql.ts       # pnpm auth:sql
│   └── brevo-sync-templates.ts # pnpm brevo:sync
├── templates/brevo/            # Transactional email HTML
├── src/
│   ├── app/                    # Root module, controller, health checks
│   ├── common/                 # Cross-cutting HTTP concerns
│   │   ├── decorators/         # @Roles, @CurrentUser
│   │   ├── dto/                # Pagination query + meta
│   │   ├── enums/              # Error codes
│   │   ├── filters/            # Exception filters
│   │   ├── guards/             # RolesGuard
│   │   ├── indicators/         # Redis health indicator
│   │   └── interceptors/       # Response envelope
│   ├── external/               # Third-party integrations
│   │   ├── email/              # Brevo via BullMQ
│   │   ├── redis/              # Shared client
│   │   └── storage/            # Cloudflare R2
│   ├── migrations/             # TypeORM migrations
│   ├── modules/
│   │   ├── account/            # GDPR export
│   │   ├── audit/              # Audit log entity + service
│   │   ├── auth/               # better-auth config, guards, decorators
│   │   └── project/            # Reference org-scoped resource — copy, then delete
│   ├── seeds/                  # Admin seeding
│   └── shared/
│       ├── config/             # Configuration, env validation, datasource
│       ├── constants/
│       ├── domain/             # BaseEntity, BaseRepository, interfaces
│       ├── logging/            # pino module
│       ├── providers/          # Database logger
│       ├── types/              # Ambient declarations
│       └── utils/              # TTL parsing, header conversion
├── test/                       # E2E tests
├── .env.example                # Every variable, annotated
├── .swcrc                      # SWC compiler config
├── eslint.config.mjs           # ESLint flat config
├── pnpm-workspace.yaml         # Build allowlist + security overrides
└── .prettierrc
```

---

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `pnpm start:dev` | Start with hot reload |
| `pnpm start:debug` | Start with debugger |
| `pnpm build` | Compile with SWC (type-checked by tsc) |
| `pnpm lint` | Lint and autofix |
| `pnpm lint:check` | Lint without writing — what CI runs |
| `pnpm format` | Format with Prettier |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | E2E tests (needs Postgres + Redis) |
| `pnpm test:cov` | Tests with coverage |

### Database

| Command | Description |
|---------|-------------|
| `pnpm db:migration:create MigrationName` | Create blank migration |
| `pnpm db:migration:generate MigrationName` | Generate migration from entities |
| `pnpm db:migration:run` | Run pending migrations |
| `pnpm db:migration:revert` | Revert last migration |
| `pnpm db:seed` | Seed the admin user (needs `ADMIN_EMAIL` + `ADMIN_PASSWORD`) |
| `pnpm auth:sql` | Print better-auth's required DDL — run after changing auth plugins |
| `pnpm brevo:sync` | Create/update the Brevo email templates, print their IDs |

### Docker - Development

| Command | Description |
|---------|-------------|
| `pnpm docker:watch:dev` | Start with hot reload (recommended) |
| `pnpm docker:up:dev` | Start services |
| `pnpm docker:down:dev` | Stop services |
| `pnpm docker:build:dev` | Rebuild containers |
| `pnpm docker:logs:dev` | View logs |
| `pnpm docker:clean:dev` | Stop and remove volumes |

| `pnpm docker:status:dev` | Service status |

### Production (Docker Swarm)

Production is a Swarm stack, not Compose — see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

| Command | Description |
|---------|-------------|
| `pnpm deploy` | Run migrations, then roll out |
| `pnpm deploy:no-migrate` | Roll out without migrating |
| `pnpm stack:status` | Service status |
| `pnpm stack:logs` | Follow app logs |
| `pnpm stack:rollback` | Revert to the previous image |
| `pnpm stack:down` | Remove the stack |

---

## Environment Variables

Create a `.env` file from `.env.example`:

`.env.example` is the complete, annotated list. These eleven are **required** —
the app refuses to boot without them:

```env
NODE_ENV=development
PORT=5500
CLIENT_URL=http://localhost:3000       # comma-separated CORS origins

DB_HOST=localhost                      # 'postgres' inside Docker
DB_PORT=5433                           # 5433 on the host; 5432 inside Docker
DB_USER=postgres
DB_PASS=postgres
DB_NAME=enterprise

REDIS_HOST=localhost                   # 'redis' inside Docker
REDIS_PORT=6379

JWT_SECRET=change-me                   # >= 32 chars
```

Everything else is optional and fails at the point of use, not at boot: R2
storage, Brevo email (`BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, and five
`BREVO_TEMPLATE_*` ids from `pnpm brevo:sync`), Sentry, Swagger branding, log
level, and health thresholds.

Three that are easy to get wrong:

| Variable | Why it matters |
|---|---|
| `BETTER_AUTH_URL` | Verification, reset and invitation links are built from it. Left at localhost, that is what users receive. |
| `TRUST_PROXY_HOPS` | `0` direct, `1` behind Caddy. Wrong either way breaks rate limiting — see [DEPLOYMENT.md](docs/DEPLOYMENT.md). |
| `DB_SSL` | `false` locally, `true` for managed Postgres. Certificate verification stays on. |

---

## API Endpoints

### Health

Deliberately outside the `/api` prefix and unversioned — probes should not have
to track an API version.

```
GET /health       - database, redis, heap, disk. Use for readiness.
GET /health/live  - process is up, no dependency calls. Use for liveness.
```

A liveness probe pointed at `/health` gets the container killed whenever the
database blips, which does not fix the database.

### Projects (reference org-scoped resource)

```
POST   /api/v1/projects       - Create in the active organization (owner/admin)
GET    /api/v1/projects       - List, paginated
GET    /api/v1/projects/:id   - Get one (404 for another org's row)
PATCH  /api/v1/projects/:id   - Update (owner/admin)
DELETE /api/v1/projects/:id   - Soft-delete (owner/admin)
```

Copy this module's shape for org-owned resources — see
[docs/TENANCY.md](docs/TENANCY.md) — then delete it.

### Account

```
GET    /api/v1/account/export - GDPR data export (JSON attachment)
POST   /api/auth/delete-user  - GDPR erasure, confirmed by email
```

### Authentication & Organizations

Served by **better-auth** under `/api/auth/*` (outside Nest's `/api/v1` prefix and
its response envelope). Full reference: [docs/AUTH.md](docs/AUTH.md).

```
POST /api/auth/sign-up/email          - Register (sends verification email)
POST /api/auth/sign-in/email          - Sign in
GET  /api/auth/get-session            - Current session + user
POST /api/auth/sign-out               - Sign out
GET  /api/auth/verify-email           - Verify email (link target)
POST /api/auth/forget-password        - Request password reset
POST /api/auth/reset-password         - Reset password with token
```

```
POST /api/auth/organization/create            - Create organization
GET  /api/auth/organization/list              - List the caller's organizations
POST /api/auth/organization/set-active        - Set active organization
POST /api/auth/organization/invite-member     - Invite by email
POST /api/auth/organization/accept-invitation - Accept an invitation
GET  /api/auth/organization/list-members      - Members of the active org
POST /api/auth/organization/update-member-role
POST /api/auth/organization/remove-member
```

Every application route (`/api/v1/*`) requires a session by default; opt out with
`@Public()`.

---

## Authentication

better-auth owns identity. Sessions are database-backed, not stateless JWTs.

- **Web**: httpOnly session cookie, set automatically on sign-in.
- **Mobile**: the sign-in response body carries a `token`; send it as
  `Authorization: Bearer <token>`. The bearer plugin accepts it everywhere a
  cookie would work.
- **Email verification** is required before a session is issued
  (`AUTH_REQUIRE_EMAIL_VERIFICATION`).
- **Roles**: `@Roles(AppRole.ADMIN)` for application-level access,
  `@OrgRoles('owner', 'admin')` for per-organization permissions.

### Making Authenticated Requests

```bash
# Sign in — returns { token, user }
curl -X POST http://localhost:5500/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"correct-horse-battery"}'

# Mobile / API client: bearer token
curl http://localhost:5500/api/v1/projects \
  -H "Authorization: Bearer <token>"

# Browser: the cookie is sent automatically
curl http://localhost:5500/api/auth/get-session --cookie "better-auth.session_token=<token>"
```

---

## Database Migrations

Migrations are tracked in the `migrations` table.

### Workflow

```bash
# 1. Make changes to entity files

# 2. Build the project (required for CLI)
pnpm build

# 3. Generate migration (just pass the name, path is automatic)
pnpm db:migration:generate AddNewColumn

# 4. Review the generated file in src/migrations/

# 5. Run migration
pnpm db:migration:run

# 6. If needed, revert
pnpm db:migration:revert
```

See [docs/MIGRATIONS_AND_DOCKER.md](docs/MIGRATIONS_AND_DOCKER.md) for detailed documentation.

---

## Docker Architecture

### Development
- Hot reload via volume mounts
- Source code synced to container
- Services: app (5500), postgres (5432), redis (6379)

### Production
- Multi-stage build (~200MB image)
- Non-root user (nestjs:1001)
- dumb-init for signal handling
- Health checks on all services
- Auto-restart on failure

See [docs/MIGRATIONS_AND_DOCKER.md](docs/MIGRATIONS_AND_DOCKER.md) for detailed documentation.

---

## CI/CD

GitHub Actions workflow (`.github/workflows/main.yml`):

1. **Test** - Runs on all pushes and PRs
2. **Build** - Compiles TypeScript, uploads artifacts
3. **Docker** - Builds and pushes to GHCR (main branch and tags only)

---

## Code Quality

### Pre-push Hook

Husky runs `pnpm docker:build:dev` before each push to ensure the Docker build succeeds.

### Linting & Formatting

```bash
# Lint with auto-fix
pnpm lint

# Format code
pnpm format
```

---

## Setup Scripts

The `scripts/` directory contains utility scripts for project setup and scaffolding.

### Initial Setup

```bash
pnpm dev:setup
```

This script (`scripts/setup.sh`):
1. Installs dependencies (if not already installed)
2. Copies `.env.example` to `.env` (if not already present)
3. Checks for Docker and Docker Compose installation
4. Verifies Docker daemon is running
5. Builds and starts the Docker Compose stack

Options:
```bash
# Development setup (default)
pnpm dev:setup

# Production setup
pnpm dev:setup prod
```

### Module Scaffolding

```bash
pnpm module:setup <module-name>
```

This script (`scripts/module-setup.sh`) creates a new NestJS module with the Clean Architecture directory structure:

```
src/modules/<module-name>/
├── application/
│   ├── dtos/
│   └── services/
├── core/
│   ├── entities/
│   ├── exceptions/
│   ├── value-objects/
│   └── interfaces/
│       ├── services/
│       └── repositories/
├── infrastructure/
│   ├── cache/
│   ├── providers/
│   ├── repositories/
│   ├── schemas/
│   └── factories/
└── presentation/
    ├── controllers/
    ├── decorators/
    ├── filters/
    ├── guards/
    ├── interceptors/
    ├── middlewares/
    └── pipes/
```

It also generates:
- Module file in `presentation/`
- Controller in `presentation/controllers/`
- Service in `application/services/`

Example:
```bash
# Create a new "products" module
pnpm module:setup products
```

---

## Path Aliases

The project supports TypeScript path aliases for cleaner imports:

| Alias | Path | Example |
|-------|------|---------|
| `@/*` | `src/*` | `import { AppRole } from '@/modules/auth/auth.config'` |
| `@mod/*` | `src/modules/*` | `import { Project } from '@mod/project/project.entity'` |
| `@@/*` | Root directory | `import { something } from '@@/package.json'` |

---

## License

UNLICENSED - Private repository

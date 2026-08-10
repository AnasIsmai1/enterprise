# Enterprise API

A general-purpose NestJS backend boilerplate: better-auth identity with multi-tenant organizations and invitations, PostgreSQL, Redis, and Docker support.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 |
| Language | TypeScript 5.7 |
| Database | PostgreSQL 16 |
| ORM | TypeORM 0.3 |
| Cache | Redis 7 |
| Auth | better-auth (sessions, organizations, invitations) |
| Authorization | `@Roles()` (app) + `@OrgRoles()` (per-organization) |
| Validation | class-validator |
| Documentation | Swagger/OpenAPI |
| Containerization | Docker + Docker Compose |

---

## Quick Start

### Prerequisites

- Node.js >= 18
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
├── docker/                    # Docker configuration
│   ├── Dockerfile            # Production multi-stage build
│   ├── Dockerfile.dev        # Development with hot reload
│   ├── docker-compose.yaml   # Production compose
│   ├── docker-compose.dev.yaml # Development compose
│   ├── entrypoint.sh         # Production startup script
│   └── entrypoint.dev.sh     # Development startup script
├── docs/                      # Documentation
│   └── MIGRATIONS_AND_DOCKER.md
├── scripts/                   # Utility scripts
│   ├── setup.sh              # Initial project setup
│   └── module-setup.sh       # Module scaffolding
├── src/
│   ├── app/                   # App module, health checks
│   ├── external/              # External service integrations
│   │   ├── email/            # Email service (Brevo)
│   │   └── redis/            # Redis module
│   ├── migrations/            # TypeORM migrations
│   ├── modules/               # Feature modules
│   │   ├── auth/             # better-auth config, guards, decorators
│   │   ├── organizations/    # Organization management
│   │   └── user/             # User management, RBAC
│   ├── seeds/                 # Database seeding
│   └── shared/               # Shared utilities
│       ├── config/           # Configuration & env validation
│       ├── decorators/       # Custom decorators
│       ├── filters/          # Exception filters
│       └── interceptors/     # Response interceptors
├── test/                      # E2E tests
├── .env.example              # Environment template
├── .eslintrc.js              # ESLint configuration
└── .prettierrc               # Prettier configuration
```

---

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `pnpm start:dev` | Start with hot reload |
| `pnpm start:debug` | Start with debugger |
| `pnpm lint` | Lint and fix code |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm test:cov` | Run tests with coverage |

### Database

| Command | Description |
|---------|-------------|
| `pnpm db:migration:create MigrationName` | Create blank migration |
| `pnpm db:migration:generate MigrationName` | Generate migration from entities |
| `pnpm db:migration:run` | Run pending migrations |
| `pnpm db:migration:revert` | Revert last migration |
| `pnpm db:seed` | Seed database |

### Docker - Development

| Command | Description |
|---------|-------------|
| `pnpm docker:watch:dev` | Start with hot reload (recommended) |
| `pnpm docker:up:dev` | Start services |
| `pnpm docker:down:dev` | Stop services |
| `pnpm docker:build:dev` | Rebuild containers |
| `pnpm docker:logs:dev` | View logs |
| `pnpm docker:clean:dev` | Stop and remove volumes |

### Docker - Production

| Command | Description |
|---------|-------------|
| `pnpm docker:build:prod` | Build production image |
| `pnpm docker:up:prod` | Start in detached mode |
| `pnpm docker:down:prod` | Stop services |
| `pnpm docker:logs:prod` | View logs |
| `pnpm docker:restart:prod` | Restart services |

---

## Environment Variables

Create a `.env` file from `.env.example`:

```env
# App
NODE_ENV=development
PORT=5500
CLIENT_URL=http://localhost:3000

# Database
DB_TYPE=postgres
DB_HOST=localhost          # Use 'postgres' in Docker
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=enterprise
DB_SSL=false

# Redis
REDIS_HOST=localhost       # Use 'redis' in Docker
REDIS_PORT=6379
REDIS_PASSWORD=

# Auth (better-auth)
JWT_SECRET=your-secret-key-change-in-production   # >= 32 chars
BETTER_AUTH_URL=http://localhost:5500             # public origin, used in email links
AUTH_REQUIRE_EMAIL_VERIFICATION=true
AUTH_SESSION_EXPIRATION=7d
AUTH_INVITATION_EXPIRATION=7d

# Email (optional)
BREVO_API_KEY=
BREVO_EMAIL=
BREVO_EMAIL_NAME=
```

---

## API Endpoints

### Health Check

```
GET /health              - Application health status
```

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
DELETE /api/auth/delete-user  - GDPR erasure, confirmed by email
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
curl http://localhost:5500/api/v1/health \
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
| `@/*` | `src/*` | `import { User } from '@/modules/user/core/entities/user.entity'` |
| `@mod/*` | `src/modules/*` | `import { User } from '@mod/user/core/entities/user.entity'` |
| `@@/*` | Root directory | `import { something } from '@@/package.json'` |

---

## License

UNLICENSED - Private repository

# Enterprise API

A production-ready NestJS backend boilerplate with JWT authentication, PostgreSQL, Redis, and Docker support.

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
| Auth | JWT + Passport |
| Authorization | CASL |
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
npm run docker:watch:dev

# 4. API is available at http://localhost:5500
```

### Option 2: Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your database/redis connection details

# 3. Run database migrations
npm run db:migration:run

# 4. Seed the database
npm run db:seed

# 5. Start development server
npm run start:dev

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
│   │   ├── auth/             # Authentication (JWT)
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
| `npm run start:dev` | Start with hot reload |
| `npm run start:debug` | Start with debugger |
| `npm run lint` | Lint and fix code |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:cov` | Run tests with coverage |

### Database

| Command | Description |
|---------|-------------|
| `npm run db:migration:create -- MigrationName` | Create blank migration |
| `npm run db:migration:generate -- MigrationName` | Generate migration from entities |
| `npm run db:migration:run` | Run pending migrations |
| `npm run db:migration:revert` | Revert last migration |
| `npm run db:seed` | Seed database |

### Docker - Development

| Command | Description |
|---------|-------------|
| `npm run docker:watch:dev` | Start with hot reload (recommended) |
| `npm run docker:up:dev` | Start services |
| `npm run docker:down:dev` | Stop services |
| `npm run docker:build:dev` | Rebuild containers |
| `npm run docker:logs:dev` | View logs |
| `npm run docker:clean:dev` | Stop and remove volumes |

### Docker - Production

| Command | Description |
|---------|-------------|
| `npm run docker:build:prod` | Build production image |
| `npm run docker:up:prod` | Start in detached mode |
| `npm run docker:down:prod` | Stop services |
| `npm run docker:logs:prod` | View logs |
| `npm run docker:restart:prod` | Restart services |

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

# Auth (JWT)
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

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

### Authentication

```
POST /auth/signin        - Login with credentials
GET  /auth/me            - Get current user (requires auth)
POST /auth/refresh       - Refresh access token
POST /auth/logout        - Logout and revoke tokens
```

### Users

```
POST /users/signup       - Register new user
POST /users/forgot-password    - Request password reset
POST /users/reset-password     - Reset password with OTP
POST /users/verify-email       - Verify email with OTP
POST /users/resend-verification - Resend verification OTP
```

### Organizations

```
POST   /organizations    - Create organization
GET    /organizations    - List user's organizations
GET    /organizations/:id - Get organization details
PUT    /organizations/:id - Update organization
DELETE /organizations/:id - Delete organization
POST   /organizations/:id/invite - Invite user
```

---

## Authentication

This project uses JWT-based authentication:

- **Access Token**: Short-lived (15m), sent in Authorization header or httpOnly cookie
- **Refresh Token**: Long-lived (7d), stored in Redis with JTI tracking
- **Token Rotation**: New refresh token issued on each refresh, old one revoked

### Making Authenticated Requests

```bash
# Login
curl -X POST http://localhost:5500/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Use access token
curl http://localhost:5500/auth/me \
  -H "Authorization: Bearer <access_token>"

# Or use cookies (automatically set on signin)
curl http://localhost:5500/auth/me --cookie "access_token=<token>"
```

---

## Database Migrations

Migrations are tracked in the `enterprise_migrations` table.

### Workflow

```bash
# 1. Make changes to entity files

# 2. Build the project (required for CLI)
npm run build

# 3. Generate migration (just pass the name, path is automatic)
npm run db:migration:generate -- AddNewColumn

# 4. Review the generated file in src/migrations/

# 5. Run migration
npm run db:migration:run

# 6. If needed, revert
npm run db:migration:revert
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

Husky runs `npm run docker:build:dev` before each push to ensure the Docker build succeeds.

### Linting & Formatting

```bash
# Lint with auto-fix
npm run lint

# Format code
npm run format
```

---

## Setup Scripts

The `scripts/` directory contains utility scripts for project setup and scaffolding.

### Initial Setup

```bash
npm run dev:setup
```

This script (`scripts/setup.sh`):
1. Installs npm dependencies (if not already installed)
2. Copies `.env.example` to `.env` (if not already present)
3. Checks for Docker and Docker Compose installation
4. Verifies Docker daemon is running
5. Builds and starts the Docker Compose stack

Options:
```bash
# Development setup (default)
npm run dev:setup

# Production setup
npm run dev:setup prod
```

### Module Scaffolding

```bash
npm run module:setup <module-name>
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
npm run module:setup products
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

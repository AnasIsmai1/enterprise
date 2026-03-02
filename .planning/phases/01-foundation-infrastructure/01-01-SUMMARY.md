---
phase: 01-foundation-infrastructure
plan: 01
subsystem: infra
tags: [nestjs, typeorm, postgres, redis, ioredis, docker, bcrypt, class-validator]

# Dependency graph
requires: []
provides:
  - Abstract BaseEntity with UUID PK and TIMESTAMPTZ created_at/updated_at
  - Strict 21-variable environment validation (crashes on boot if missing)
  - TypeORM CLI datasource with synchronize: false and poshpet_migrations table
  - Docker Compose with PoshPet naming, PG16 + Redis7, DB port bound to 127.0.0.1
  - Global RedisModule providing REDIS_CLIENT token via ioredis DI
  - UserRole enum (free/premium/superadmin) replacing DB-backed role system
  - Pagination with has_more, total_pages, max limit 100, sort/order support
  - BCRYPT_ROUNDS = 12 constant for Phase 2 password hashing
  - .env.example documenting all 21 required environment variables
affects:
  - 01-02-health-monitoring
  - 01-03-storage-queue
  - 02-auth
  - 03-pets
  - all subsequent phases (BaseEntity dependency)

# Tech tracking
tech-stack:
  added:
    - "@nestjs/throttler ^6.5.0"
    - "@nestjs/terminus ^11.1.1"
    - "@sentry/nestjs ^10.40.0"
    - "@aws-sdk/client-s3 ^3.1000.0"
    - "@aws-sdk/s3-request-presigner ^3.1000.0"
    - "bullmq ^5.70.1"
    - "@nestjs/bullmq ^11.0.4"
    - "bcrypt ^6.0.0"
    - "@types/bcrypt"
    - "@types/multer"
  removed:
    - "@casl/ability"
    - "mysql2"
    - "connect-redis"
    - "express-session"
    - "@nestjs/serve-static"
    - "@types/express-session"
  patterns:
    - "Abstract BaseEntity: all entities extend abstract class (no @Entity on base)"
    - "Config nesting: app.*, database.*, redis.*, storage.*, email.*, sentry.*, admin.*, jwt.*"
    - "synchronize always false: TypeORM CLI generates all migrations"
    - "Global Redis: @Global() @Module() with REDIS_CLIENT injection token"
    - "Pagination: max limit 100, returns has_more + total_pages, default sort created_at DESC"

key-files:
  created:
    - src/shared/domain/base.entity.ts
    - src/shared/constants/security.constants.ts
    - src/external/redis/redis.module.ts
    - .env.example
  modified:
    - src/app/app.module.ts
    - src/shared/config/env.validation.ts
    - src/shared/config/configuration.ts
    - src/shared/config/typeorm.datasource.ts
    - src/shared/domain/base.repository.ts
    - src/shared/domain/interfaces/pagination.interface.ts
    - src/modules/user/core/entities/user.entity.ts
    - src/modules/user/presentation/user.module.ts
    - src/modules/user/infrastructure/repositories/user.repository.ts
    - src/modules/auth/presentation/auth.module.ts
    - src/modules/auth/infrastructure/strategies/jwt.strategy.ts
    - src/modules/auth/application/services/auth.service.ts
    - src/external/email/email.module.ts
    - src/external/email/email.service.ts
    - docker/docker-compose.dev.yaml
    - src/main.ts
    - src/seeds/datasource.ts
    - src/seeds/user.seed.ts
    - src/seeds/index.ts

key-decisions:
  - "UserRole as enum column (free/premium/superadmin) instead of DB-backed RBAC table - simpler and sufficient for PoshPet"
  - "synchronize unconditionally false - TypeORM CLI controls all schema changes"
  - "Email service rewritten to use Brevo template IDs instead of local HTML templates"
  - "Config keys restructured: jwt.secret (not auth.jwt_secret), database.user (not database.username), etc."
  - "Pagination max limit capped at 100 (API-07), default sort created_at DESC (API-09)"
  - "DB port bound to 127.0.0.1:5432 in Docker Compose for local dev security (SEC-13)"

patterns-established:
  - "All entities must extend abstract BaseEntity (no @Entity on base class)"
  - "Config keys use nested dot notation matching configuration.ts factory structure"
  - "All migrations use poshpet_migrations table name"

requirements-completed: [INFRA-01, INFRA-02, INFRA-05, INFRA-07, INFRA-08, INFRA-09, SEC-03, SEC-05, SEC-12, SEC-13]

# Metrics
duration: 8min
completed: 2026-03-02
---

# Phase 1 Plan 01: Foundation Infrastructure Cleanup Summary

**NestJS boilerplate stripped to bare essentials: abstract BaseEntity with correct TIMESTAMPTZ columns, 21-variable strict env validation via class-validator, global Redis DI via ioredis, Docker Compose renamed to PoshPet with localhost-only DB port, and synchronize unconditionally false**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-02T10:37:56Z
- **Completed:** 2026-03-02T10:46:00Z
- **Tasks:** 2
- **Files modified:** 35 (including 20 deleted)

## Accomplishments

- Fixed critical BaseEntity bug: swapped @CreateDateColumn/@UpdateDateColumn corrected, added `abstract` keyword, removed `@Entity()`, both columns use `type: 'timestamp with time zone'`
- Deleted all CASL/organization boilerplate (15 files): organizations module, role/permission/user_role entities, casl.factory, casl.guard, auth.types, abilities.decorator, authorization.seed
- Established 21-variable strict env validation with class-validator that crashes on boot with clear error messages if any required variable is missing
- Created global RedisModule providing `REDIS_CLIENT` injection token via ioredis (dependency for Plans 02 and 03)
- Created `BCRYPT_ROUNDS = 12` security constant ready for Phase 2 auth (SEC-03)
- Renamed Docker Compose from "enterprise" to "poshpet", DB port bound to localhost only (SEC-13)
- Updated pagination to return `has_more`, `total_pages`, enforce max limit 100, support sort/order

## Task Commits

1. **Task 1: Strip boilerplate, fix BaseEntity, establish Redis/security** - `e0fb27d` (feat)
2. **Task 2: Harden env validation, update config, Docker, pagination** - `0ae1616` (feat)

## Files Created/Modified

- `src/shared/domain/base.entity.ts` - Abstract BaseEntity with correct TIMESTAMPTZ columns and UUID PK
- `src/shared/constants/security.constants.ts` - BCRYPT_ROUNDS = 12 constant (SEC-03)
- `src/external/redis/redis.module.ts` - Global Redis module with REDIS_CLIENT DI token
- `src/shared/config/env.validation.ts` - 21-variable strict class-validator schema
- `src/shared/config/configuration.ts` - Typed nested config factory (app/database/redis/storage/email/sentry/admin/jwt)
- `src/shared/config/typeorm.datasource.ts` - TypeORM CLI datasource, poshpet_migrations, synchronize: false
- `src/shared/domain/base.repository.ts` - Enhanced pagination with has_more, total_pages, max limit 100
- `src/shared/domain/interfaces/pagination.interface.ts` - Updated with has_more, total_pages, sort/order
- `src/modules/user/core/entities/user.entity.ts` - Added UserRole enum (free/premium/superadmin) and role column
- `docker/docker-compose.dev.yaml` - Renamed enterprise -> poshpet, DB port 127.0.0.1 only
- `.env.example` - All 21 required variables documented with grouping comments
- `src/main.ts` - CORS uses CLIENT_URL, helmet enabled, ValidationPipe global, URI versioning

## Decisions Made

- **UserRole as simple enum column** instead of DB-backed RBAC: PoshPet has 3 tiers (free/premium/superadmin), no enterprise multi-org complexity needed
- **synchronize unconditionally false**: prevents any accidental schema drift, all changes through TypeORM CLI
- **Email service simplified to Brevo template IDs**: removed local HTML template files, use Brevo's template system instead
- **Config key restructure**: from old `auth.jwt_secret` / `database.username` / `brevo.api_key` to `jwt.secret` / `database.user` / `email.brevoApiKey` to match plan spec

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed email module and service after deleting email-templates.service.ts**
- **Found during:** Task 1 (boilerplate deletion phase)
- **Issue:** `email.module.ts` provided `EmailTemplatesService` and `EmailService` depended on it; deleting `email-templates.service.ts` broke the email module
- **Fix:** Rewrote `EmailService` to remove `EmailTemplatesService` dependency and use Brevo transactional template IDs directly; simplified `EmailModule` to remove the template provider
- **Files modified:** `src/external/email/email.service.ts`, `src/external/email/email.module.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `e0fb27d` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed app.controller.ts calling deleted sendWelcomeEmail method**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** `AppController` had a test email endpoint calling `emailService.sendWelcomeEmail()` which no longer exists
- **Fix:** Removed test email endpoint and EmailService import from AppController
- **Files modified:** `src/app/app.controller.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `e0fb27d` (Task 1 commit)

**3. [Rule 1 - Bug] Updated auth.service.ts, auth.module.ts, jwt.strategy.ts to use new config keys**
- **Found during:** Task 2 (configuration restructure)
- **Issue:** Auth files still referenced old config keys (`auth.jwt_secret`, `auth.jwt_expiration`, `auth.jwt_refresh_expiration`) which no longer exist in the new configuration.ts structure
- **Fix:** Updated all auth files to use `jwt.secret`, `jwt.expiration`, `jwt.refreshExpiration`
- **Files modified:** `src/modules/auth/application/services/auth.service.ts`, `src/modules/auth/presentation/auth.module.ts`, `src/modules/auth/infrastructure/strategies/jwt.strategy.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors; `npm run build` passes
- **Committed in:** `0ae1616` (Task 2 commit)

**4. [Rule 1 - Bug] Removed userRoles relation references after deleting user_role.entity.ts**
- **Found during:** Task 1 (entity deletion phase)
- **Issue:** `user.repository.ts` had `relations: ['userRoles', 'userRoles.role']`, `auth.service.ts` accessed `user.userRoles?.map(r => r.role?.name)`, which referenced deleted entities
- **Fix:** Updated `UserRepository.findByEmail` to remove deleted relations; updated `AuthService` to use `user.role` (single enum value) instead of `user.userRoles` array
- **Files modified:** `src/modules/user/infrastructure/repositories/user.repository.ts`, `src/modules/auth/application/services/auth.service.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `e0fb27d` (Task 1 commit)

---

**Total deviations:** 4 auto-fixed (4 Rule 1 bugs caused by planned deletions)
**Impact on plan:** All auto-fixes were direct consequences of the planned boilerplate removal. No scope creep.

## Issues Encountered

None beyond the auto-fixed import cascades from boilerplate deletion.

## User Setup Required

None - no external service configuration required for this plan. Copy `.env.example` to `.env` and fill in values before running.

## Next Phase Readiness

- BaseEntity is correct and ready for all entity definitions in Plans 02-07
- TypeORM CLI workflow is configured (synchronize: false, poshpet_migrations table)
- RedisModule provides `REDIS_CLIENT` token globally — Plans 02 and 03 can inject it
- Env validation will catch missing variables on boot — safe to develop against
- Plans 01-02 (health/monitoring) and 01-03 (storage/queue) can proceed immediately

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-03-02*

## Self-Check: PASSED

- All 13 key files verified present on disk
- Both task commits (e0fb27d, 0ae1616) verified in git log
- `npx tsc --noEmit` passes with zero errors

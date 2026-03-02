---
phase: 01-foundation-infrastructure
plan: 02
subsystem: api
tags: [nestjs, throttler, terminus, sentry, typeorm, swagger, audit, rbac]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure plan 01
    provides: BaseEntity, UserRole enum, config keys (jwt.secret/database.user/email.brevoApiKey), RedisModule with REDIS_CLIENT token

provides:
  - ErrorCode enum (9 codes) with HTTP status lookup table
  - AllExceptionsFilter: Sentry on 5xx, local log on 4xx, admin email on critical errors
  - HttpExceptionFilter: standardized { success: false, error: { code, message, field? } }
  - ResponseInterceptor: { success: true, data, meta? } response envelope
  - LoggingInterceptor: structured JSON logging with sensitive field redaction
  - PaginationQueryDto (page/limit/sort/order) and PaginationMeta (from() factory)
  - ThrottlerModule: 100 req/min globally via APP_GUARD ThrottlerGuard
  - Health endpoint (/health) with Postgres, Redis, disk, memory indicators via @nestjs/terminus
  - Sentry initialized in main.ts before NestFactory.create()
  - AuditLog entity (audit_logs table) and @Global() AuditModule with AuditLogService.log()
  - @Roles() decorator and RolesGuard for simple role-based access control
  - @CurrentUser() param decorator for extracting authenticated user from request
  - Swagger updated with PoshPet branding and Bearer JWT auth support
affects:
  - All future phases (2-7) — every endpoint uses filters, interceptors, pagination, and auth decorators
  - Phase 02-auth: JwtAuthGuard populates req.user, RolesGuard checks req.user.role
  - Phase 02-auth: AuditLogService.log() for LOGIN/LOGOUT/PASSWORD_RESET events
  - Phase 04-pets and beyond: PaginationQueryDto and PaginationMeta for list endpoints

# Tech tracking
tech-stack:
  added:
    - "@nestjs/terminus v11 — health checks with Postgres, Redis, disk, memory"
    - "@nestjs/throttler v6 — rate limiting with ThrottlerGuard as APP_GUARD"
    - "@sentry/nestjs v10 — exception tracking initialized before NestFactory.create()"
  patterns:
    - "Global exception filters via APP_FILTER (supports DI, unlike useGlobalFilters)"
    - "AllExceptionsFilter registered BEFORE HttpExceptionFilter (NestJS reverse-order execution)"
    - "LoggingInterceptor wraps outer, ResponseInterceptor wraps inner in useGlobalInterceptors()"
    - "AuditModule @Global() for cross-module audit logging without explicit imports"
    - "SEC-09/SEC-10 ownership pattern: scoped queries in services, return 404 not 403"

key-files:
  created:
    - src/common/enums/error-code.enum.ts
    - src/common/filters/all-exceptions.filter.ts
    - src/common/filters/http-exception.filter.ts
    - src/common/interceptors/response.interceptor.ts
    - src/common/interceptors/logging.interceptor.ts
    - src/common/dto/pagination-query.dto.ts
    - src/common/dto/pagination-meta.dto.ts
    - src/common/indicators/redis-health.indicator.ts
    - src/common/decorators/roles.decorator.ts
    - src/common/decorators/current-user.decorator.ts
    - src/common/guards/roles.guard.ts
    - src/modules/audit/audit.entity.ts
    - src/modules/audit/audit.service.ts
    - src/modules/audit/audit.module.ts
  modified:
    - src/main.ts (Sentry init, new interceptors, updated imports)
    - src/app/app.module.ts (ThrottlerModule, AuditModule, APP_GUARD, APP_FILTER)
    - src/app/health/health.controller.ts (rewritten with terminus)
    - src/app/health/health.module.ts (added TerminusModule)
    - src/shared/config/swagger.ts (PoshPet branding, Bearer auth)
    - src/shared/config/typeorm.datasource.ts (added AuditLog entity)
  deleted:
    - src/shared/interceptors/response/ (old ResponseInterceptor location)
    - src/app/health/health.controller.spec.ts (outdated spec for rewritten controller)

key-decisions:
  - "APP_FILTER over useGlobalFilters() for exception filters — APP_FILTER supports DI (ConfigService injection for isDev/Sentry); useGlobalFilters would require manual instantiation"
  - "AllExceptionsFilter + HttpExceptionFilter both registered as APP_FILTER — NestJS reverse-order execution means HttpExceptionFilter runs first for HttpExceptions, AllExceptionsFilter catches everything else"
  - "nestjs-throttler-storage-redis not installed — using default in-memory ThrottlerModule; for distributed rate limiting (INFRA-07), install nestjs-throttler-storage-redis and configure Redis store"
  - "AuditModule @Global() — audit logging needed everywhere (auth, admin, pets) without importing module in each feature"
  - "SEC-09/SEC-10 as coding convention, not guard logic — documented in RolesGuard comments; resource ownership scoped in service layer"

patterns-established:
  - "Response envelope: all success responses wrapped { success: true, data, meta? }; all errors { success: false, error: { code, message, field? } }"
  - "Sensitive field redaction: SENSITIVE_FIELDS list in LoggingInterceptor; same pattern used in RequestLoggerMiddleware"
  - "Dev-only debug fields: isDev check on NODE_ENV adds stack/timestamp/path to error responses"
  - "Health indicator pattern: inject REDIS_CLIENT, extend HealthIndicator, throw HealthCheckError on failure"

requirements-completed:
  - INFRA-03
  - INFRA-04
  - INFRA-06
  - API-01
  - API-02
  - API-03
  - API-04
  - API-05
  - API-06
  - API-07
  - API-08
  - API-09
  - API-10
  - API-11
  - API-12
  - API-13
  - API-14
  - API-15
  - API-16
  - SEC-01
  - SEC-02
  - SEC-04
  - SEC-06
  - SEC-07
  - SEC-08
  - SEC-09
  - SEC-10
  - SEC-11
  - SEC-14

# Metrics
duration: 9min
completed: 2026-03-02
---

# Phase 1 Plan 2: API Convention Layer Summary

**Standardized request lifecycle with ErrorCode enum, global exception filters (Sentry/email on 5xx), ResponseInterceptor envelope, LoggingInterceptor with redaction, ThrottlerModule at 100 req/min, @nestjs/terminus health checks, AuditLog entity, @Roles() guard, and PoshPet Swagger**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-02T10:50:55Z
- **Completed:** 2026-03-02T11:00:00Z
- **Tasks:** 2
- **Files modified:** 20 (14 created, 6 modified, 2 deleted)

## Accomplishments

- Built complete API convention layer: every new endpoint automatically gets validated input, standardized response envelope `{ success, data, meta? }`, rate limit headers, error formatting with 9 error codes, Sentry tracking on 5xx, and structured JSON logging
- Established security middleware: Sentry initialized before bootstrap, AllExceptionsFilter handles 5xx to Sentry + admin email, HttpExceptionFilter handles 4xx locally only, audit_logs table ready for Phase 2 auth events
- Created role-based access infrastructure: @Roles() decorator, RolesGuard, @CurrentUser() decorator ready for Phase 2 JwtAuthGuard integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Exception filters, error codes, response interceptor, pagination DTOs** - `3d03432` (feat)
2. **Task 2: Rate limiting, health checks, Sentry, audit logging, role guards, Swagger** - `ca66f77` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

**Created:**
- `src/common/enums/error-code.enum.ts` - 9 ErrorCode values with HTTP status lookup table
- `src/common/filters/all-exceptions.filter.ts` - Catch-all with Sentry, local logging, admin email
- `src/common/filters/http-exception.filter.ts` - HttpException mapper with ValidationPipe support
- `src/common/interceptors/response.interceptor.ts` - { success, data, meta? } response envelope
- `src/common/interceptors/logging.interceptor.ts` - Structured JSON logging with sensitive field redaction
- `src/common/dto/pagination-query.dto.ts` - Validated page/limit/sort/order with class-validator
- `src/common/dto/pagination-meta.dto.ts` - PaginationMeta.from() factory
- `src/common/indicators/redis-health.indicator.ts` - Redis PING health indicator for terminus
- `src/common/decorators/roles.decorator.ts` - @Roles() with ROLES_KEY metadata
- `src/common/decorators/current-user.decorator.ts` - @CurrentUser() param decorator
- `src/common/guards/roles.guard.ts` - RolesGuard with SEC-09/10 convention comment
- `src/modules/audit/audit.entity.ts` - audit_logs table entity with 90-day retention note
- `src/modules/audit/audit.service.ts` - AuditLogService.log() for recording events
- `src/modules/audit/audit.module.ts` - @Global() AuditModule exporting AuditLogService

**Modified:**
- `src/main.ts` - Sentry.init() before bootstrap, LoggingInterceptor + ResponseInterceptor wired
- `src/app/app.module.ts` - ThrottlerModule, AuditModule, APP_FILTER (both filters), APP_GUARD
- `src/app/health/health.controller.ts` - Rewritten with terminus (db, redis, memory, disk) and @SkipThrottle()
- `src/app/health/health.module.ts` - Imports TerminusModule, provides RedisHealthIndicator
- `src/shared/config/swagger.ts` - PoshPet branding, Bearer JWT auth, API group tags
- `src/shared/config/typeorm.datasource.ts` - AuditLog added to entities array

**Deleted:**
- `src/shared/interceptors/response/` - Old ResponseInterceptor location (moved to src/common/)
- `src/app/health/health.controller.spec.ts` - Outdated spec for old DataSource-based controller

## Decisions Made

- **APP_FILTER for exception filters (not useGlobalFilters):** Filters need ConfigService for isDev check and Sentry. APP_FILTER integrates with NestJS DI; useGlobalFilters would require manual instantiation from app container.
- **In-memory ThrottlerModule (not Redis store):** `nestjs-throttler-storage-redis` not in project dependencies. Default in-memory store works for single-instance; Redis store should be added when horizontal scaling is needed.
- **AuditModule @Global():** Audit logging needed across auth, admin, and feature modules. @Global() eliminates repetitive module imports while keeping the service injectable everywhere.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Deleted outdated health.controller.spec.ts**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Old spec referenced `getHealth()` method which no longer exists after rewriting health controller with terminus `check()` method — compilation failed
- **Fix:** Deleted `src/app/health/health.controller.spec.ts` (plan mentioned this as optional cleanup)
- **Files modified:** src/app/health/health.controller.spec.ts (deleted)
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** ca66f77 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — stale spec file causing TS compilation failure)
**Impact on plan:** Fix was necessary for TypeScript compilation. No scope creep.

## Issues Encountered

- The `AllExceptionsFilter` and `HttpExceptionFilter` are wired BOTH via `APP_FILTER` in `AppModule` AND imported in `main.ts`. The `APP_FILTER` registration is the primary one (supports DI). The `main.ts` imports are kept for documentation clarity but `app.useGlobalFilters()` is NOT called — the filters run via DI only. This is intentional and correct.

## User Setup Required

None - no external service configuration required beyond existing env variables (SENTRY_DSN already in env.validation.ts from Plan 01).

## Next Phase Readiness

- API convention layer complete — all future endpoints automatically get standardized responses, rate limiting, Sentry tracking, and structured logging
- Phase 2 (Auth): JwtAuthGuard will populate `req.user` — RolesGuard and @CurrentUser() are ready to use immediately
- Phase 2 (Auth): AuditLogService.log() ready for LOGIN/LOGOUT/PASSWORD_RESET events
- Phase 2-7: PaginationQueryDto + PaginationMeta ready for all list endpoints
- Concern: Rate limiting uses in-memory store (single-instance only). For horizontal scaling, install `nestjs-throttler-storage-redis`

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-03-02*

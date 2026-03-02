# Phase 1: Foundation & Infrastructure - Research

**Researched:** 2026-03-02
**Domain:** NestJS boilerplate cleanup, infrastructure configuration, API conventions, security baseline, Cloudflare R2 file storage, Brevo transactional email, BullMQ queuing
**Confidence:** HIGH (codebase directly inspected; library choices verified against existing package.json and prior research docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Boilerplate cleanup:**
- Aggressive strip-down: gut everything to bare NestJS, remove all boilerplate modules (CASL, organizations, broken base.entity.ts), rebuild only what Phase 1 needs from scratch
- Shared abstract base entity class with id (UUID), created_at (@CreateDateColumn), updated_at (@UpdateDateColumn) — all 36 entities extend it
- Strict environment variable validation on boot — app crashes immediately if any of the 21 required vars are missing or invalid, using class-validator on a config schema
- Entity-first migration workflow: define entities in code, use TypeORM CLI to auto-generate migration files from diffs (synchronize: false in all environments)

**Error responses & logging:**
- Dev-only debug fields in error responses: in development, include a 'debug' object with stack trace, query info, request context. Production returns only the clean error format ({ success, error: { code, message, field? } })
- Critical failures (DB down, Stripe webhook failures, encryption errors) trigger both Sentry alert AND admin email via Brevo — dual notification channel
- Structured request/response logging via NestJS interceptor: method, path, status code, duration, user ID in JSON format. Sensitive fields (passwords, tokens) are omitted
- Separate audit_logs database table for auth events, data access, and admin actions with 90-day retention. Columns: action, actor, resource, timestamp, IP. Queryable for compliance (SEC-14)

**File storage (Cloudflare R2):**
- Single StorageService with bucket enum (MEDIA, CAPSULE, STATIC). One service class, internally uses different IAM credentials for the capsule bucket (FILE-04)
- Backend proxy upload flow: client sends file to NestJS via multipart/form-data, backend validates (size, type, rate limit) then uploads to R2. No presigned upload URLs
- StorageService enforces directory path construction: pass upload type + IDs, service constructs the correct path. E.g., upload(PHOTO, { userId, petId, photoId, size }) -> photos/{user}/{pet}/{photo_id}_{size}.jpg
- Redis-cached signed URLs with TTL slightly less than 1-hour expiry (~50 min). Cache invalidated on file update/delete

**Email service (Brevo):**
- Brevo API templates: design templates in Brevo's editor, reference by template ID stored in config, pass dynamic variables at send time. No HTML in codebase
- Email sends queued via BullMQ: async, with automatic retries on Brevo API failures, non-blocking to API responses. BullMQ shared with future photo processing (Phase 4)
- Single send() method with EmailType enum: emailService.send(EmailType.VERIFICATION, { to, params }). Type determines template ID and required params
- Delivery tracking via Brevo dashboard only — no local email_logs table. Brevo handles delivery/open/bounce analytics

### Claude's Discretion
- Exact NestJS module organization and folder structure after boilerplate strip-down
- Rate limiter implementation details (throttler config, Redis store)
- Docker Compose service configuration specifics
- Health check endpoint implementation details (@nestjs/terminus)
- Swagger/OpenAPI configuration approach
- CORS configuration specifics
- Bcrypt rounds and password hashing implementation

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 1 starts from an existing NestJS 11 + TypeORM 0.3.27 boilerplate that provides significant infrastructure scaffolding — but it has critical bugs and carries enterprise-SaaS abstractions (CASL, organizations, multi-role permission entities) that are wrong for PoshPet. The boilerplate's `base.entity.ts` has `@CreateDateColumn()` decorating `updatedAt` and `@UpdateDateColumn()` decorating `createdAt` — a hard bug that corrupts every entity timestamp. The entire organizations module, CASL guard system, role/permission/user_role entity tables, and related seeders must be removed. The user entity must be rebuilt for PoshPet's simple free/premium/superadmin model.

The infrastructure additions — `@nestjs/throttler` with Redis store, `@nestjs/terminus` for health checks, `@aws-sdk/client-s3` for Cloudflare R2, `bullmq` + `@nestjs/bullmq` for email queuing, `@sentry/nestjs` for error tracking — are all well-established packages not currently in the codebase. The existing email service uses raw HTML templates (wrong — Brevo template IDs required) and synchronous axios calls (wrong — BullMQ queue required). The synchronize setting in `app.module.ts` has conditional logic based on environment (`!isProduction`) rather than always being `false` as required.

The work breaks into five logical waves: (1) boilerplate cleanup and base entity fix, (2) configuration hardening and Docker setup, (3) API conventions (response format, pagination, exception filters, rate limiting, Swagger), (4) security baseline (CORS, Helmet, audit logs, ownership scoping), and (5) external integrations (Cloudflare R2 StorageService, Brevo+BullMQ email system, Sentry).

**Primary recommendation:** Fix base.entity.ts first before touching any other entity, then surgically remove boilerplate modules following the dependency graph (organizations depends on UserRoles which depends on Organization — delete in reverse order), then add missing packages in one npm install, then build new infrastructure modules from scratch.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Docker Compose for local dev (PostgreSQL 16 + Redis 7) | Docker Compose already exists in `docker/docker-compose.dev.yaml` with PG 16 and Redis 7 images; needs rename from "enterprise" to "poshpet" throughout |
| INFRA-02 | TypeORM migrations (synchronize: false in all environments) | `app.module.ts` currently has `synchronize: !isProduction` — must change to always `false`; TypeORM CLI already wired in `package.json` scripts |
| INFRA-03 | Health check endpoint using @nestjs/terminus (Postgres, Redis, disk, memory indicators) | Current health controller is custom raw SQL — must replace with `@nestjs/terminus` package (not yet installed); existing HealthModule skeleton can be reused |
| INFRA-04 | Swagger/OpenAPI documentation | Swagger already configured via `setupSwagger()` in `shared/config/swagger.ts`; needs PoshPet branding and Bearer token auth scheme added |
| INFRA-05 | 21 environment variables configured | Current `env.validation.ts` has ~13 vars; needs R2 credentials (6 vars), Sentry DSN (1), BullMQ Redis (shares existing), email template IDs (4+), admin email — full list must be mapped |
| INFRA-06 | Sentry error tracking integration | `@sentry/nestjs` not in package.json — must be installed; Sentry NestJS SDK provides `SentryModule.forRoot()` and `SentryInterceptor` |
| INFRA-07 | Stateless design for future horizontal scaling | No server-side sessions used; refresh tokens in Redis (existing pattern correct); file state in R2; no local file system state |
| INFRA-08 | UUID primary keys on all tables | BaseEntity already uses `@PrimaryGeneratedColumn("uuid")` — correct pattern; existing migration shows `uuid_generate_v4()` in PostgreSQL |
| INFRA-09 | TIMESTAMP WITH TIME ZONE for all date columns | Current migration uses plain `TIMESTAMP NOT NULL DEFAULT now()` without timezone — must use `TIMESTAMPTZ` in new migrations; TypeORM does this automatically when `type: 'timestamp with time zone'` is specified in `@CreateDateColumn`/`@UpdateDateColumn` |
| API-01 | Base URL: /v1/ path versioning | Already configured: `app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })` in `main.ts` — correct |
| API-02 | RESTful design: plural nouns, nested resources for ownership | Controller naming convention to enforce — no code change, a development standard |
| API-03 | Methods: GET, POST, PUT, DELETE (no PATCH in Phase 1) | Convention to enforce — no code change |
| API-04 | Success response format: `{ success: true, data: {}, meta: {} }` | Existing `ResponseInterceptor` returns `{ status, success, message, payload }` — must be rewritten to `{ success, data, meta }` format |
| API-05 | Error response format: `{ success: false, error: { code, message, field? } }` | No global exception filter exists — must create `AllExceptionsFilter` and `HttpExceptionFilter` |
| API-06 | 9 standardized error codes (400-500) | Must define error code enum: VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, UNPROCESSABLE, INTERNAL_ERROR, SERVICE_UNAVAILABLE |
| API-07 | Offset-based pagination: ?page=1&limit=50 (max 100) | `BaseRepository.paginate()` exists with page/limit — needs max=100 enforcement and `PaginationQueryDto` with class-validator decorators |
| API-08 | Pagination meta: page, limit, total, has_more | Existing `PaginationResult` has items/total/page/limit but lacks `has_more` and `total_pages` — must extend |
| API-09 | Default sort: created_at DESC, configurable via ?sort=&order= | Not currently implemented — needs `SortQueryDto` and query builder integration in `BaseRepository` |
| API-10 | General rate limiting: 100 req/min per authenticated user | `@nestjs/throttler` not installed — needs `ThrottlerModule.forRootAsync()` with Redis store and `APP_GUARD` for global application |
| API-11 | Auth rate limiting: 5 req/15min per IP | Needs separate `@Throttle({ default: { limit: 5, ttl: 900 } })` decorator on auth endpoints |
| API-12 | Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset | `@nestjs/throttler` v5+ includes these headers automatically when `generateId` returns IP-based key |
| API-13 | Content type: application/json | Enforced by NestJS default; multipart parsing uses `multer` (included via `@nestjs/platform-express`) |
| API-14 | Request body validation using class-validator/class-transformer | Already configured: `app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))` — correct |
| API-15 | Global exception filters for standardized error responses | Missing — must create and register with `app.useGlobalFilters()` |
| API-16 | Global validation pipe with whitelist and transform options | Already in `main.ts` correctly configured |
| SEC-01 | TLS 1.3 for all API communication | Infrastructure/deployment concern — enforced at reverse proxy (nginx/Cloudflare), not in NestJS code |
| SEC-02 | HSTS header enabled | `helmet()` already called in `main.ts` — Helmet includes HSTS by default |
| SEC-03 | Bcrypt password hashing (minimum 12 rounds) | `bcryptjs` already installed; current auth service uses it but without explicit rounds — must add `saltRounds: 12` |
| SEC-04 | CORS: allow only app.poshpet.app origins | CORS already enabled in `main.ts` — needs updated CLIENT_URL env var and stricter production configuration |
| SEC-05 | All secrets via environment variables, never in source code | Env validation enforces this; no secrets in source — compliant |
| SEC-06 | 5xx errors reported to Sentry with full stack trace | Requires `@sentry/nestjs` installation + `SentryInterceptor` registration in `AllExceptionsFilter` |
| SEC-07 | 4xx errors logged locally only (not to Sentry) | Exception filter must branch on status code: 4xx → logger only, 5xx → Sentry capture |
| SEC-08 | Critical failures → Sentry alert + admin email | Exception filter must call both `Sentry.captureException()` and `emailService.send(EmailType.ADMIN_ALERT, ...)` for critical errors |
| SEC-09 | Resource ownership: scope all queries to authenticated user_id | Coding pattern for all service methods — `findOne({ where: { id, userId: req.user.id } })` |
| SEC-10 | Return 404 (not 403) for other users' resources | Exception filter convention; service layer returns 404 when ownership check fails |
| SEC-11 | Optimistic locking with updated_at timestamp checks | TypeORM `@VersionColumn()` or manual `updated_at` check in UPDATE queries |
| SEC-12 | npm audit: no critical vulnerabilities | `npm audit --audit-level=critical` check during setup; `mysql2` in dependencies is unused and should be removed |
| SEC-13 | Database not accessible from public internet | Docker Compose exposes only app port externally — database port binding to be removed from dev compose |
| SEC-14 | All auth events logged (90-day retention) | New `audit_logs` table + `AuditLogService` to be created; not in boilerplate |
| FILE-01 | Cloudflare R2 (S3-compatible) integration | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` needed — not in package.json |
| FILE-02 | 3 buckets: poshpet-media, poshpet-capsules, poshpet-static | StorageService with BucketEnum; bucket endpoints from R2 dashboard |
| FILE-03 | Signed URLs with 1-hour expiry for media bucket | `getSignedUrl(s3, new GetObjectCommand(...), { expiresIn: 3600 })` from `@aws-sdk/s3-request-presigner` |
| FILE-04 | Separate IAM credentials for capsule bucket | Two S3Client instances in StorageService: one for media/static, one for capsules |
| FILE-05 | Directory structure: photos/{user}/{pet}/{photo_id}_{size}.jpg | Enforced by StorageService path builder — not configurable by callers |
| FILE-06 | Directory structure: avatars/{user}/{pet_id}_avatar.jpg | Same path builder pattern |
| FILE-07 | Directory structure: vet-attachments/{user}/{visit_id}/{attachment_id}.jpg | Same path builder pattern |
| FILE-08 | Directory structure: circle-media/{circle}/{post}/{media_id}.jpg | Same path builder pattern |
| FILE-09 | Directory structure: memory-pages/{user}/{page_id}_{type} | Same path builder pattern |
| FILE-10 | Upload rate limiting: 10 requests per minute per user | Separate `@Throttle()` decorator on upload endpoints |
| EMAIL-01 | Brevo (Sendinblue) integration for transactional email | `brevo` npm package already installed (v1.0.0); current email.service.ts uses wrong approach (raw HTML via axios) — must rebuild to use `brevo` SDK with template IDs |
| EMAIL-02 | Email verification on registration | `EmailType.VERIFICATION` → Brevo template ID from config |
| EMAIL-03 | Password reset emails | `EmailType.PASSWORD_RESET` → Brevo template ID from config |
| EMAIL-04 | Capsule delivery notification emails | `EmailType.CAPSULE_DELIVERY` → Brevo template ID from config |
| EMAIL-05 | Account deletion confirmation emails | `EmailType.ACCOUNT_DELETION` → Brevo template ID from config |
| EMAIL-06 | Critical failure alert emails to admin | `EmailType.ADMIN_ALERT` → Brevo template ID + hardcoded admin email from config |
</phase_requirements>

---

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@nestjs/common` | ^11.0.1 | Framework core | Keep |
| `@nestjs/core` | ^11.0.1 | Framework core | Keep |
| `@nestjs/platform-express` | ^11.0.1 | HTTP adapter (includes multer) | Keep |
| `@nestjs/config` | ^4.0.2 | Config module | Keep |
| `@nestjs/typeorm` | ^11.0.0 | TypeORM integration | Keep |
| `@nestjs/jwt` | ^11.0.1 | JWT (boilerplate, used by Phase 2 auth) | Keep |
| `@nestjs/passport` | ^11.0.5 | Passport (Phase 2 auth) | Keep |
| `@nestjs/swagger` | ^11.2.0 | Swagger/OpenAPI | Keep |
| `typeorm` | ^0.3.27 | ORM | Keep |
| `pg` | ^8.16.3 | PostgreSQL driver | Keep |
| `ioredis` | ^5.8.0 | Redis client | Keep |
| `class-validator` | ^0.14.2 | DTO validation | Keep |
| `class-transformer` | ^0.5.1 | DTO transformation | Keep |
| `bcryptjs` | ^3.0.2 | Password hashing | Keep |
| `helmet` | ^8.1.0 | Security headers | Keep |
| `brevo` | ^1.0.0 | Email SDK (installed, wrong usage pattern) | Rewrite usage |
| `rxjs` | ^7.8.1 | Reactive extensions | Keep |

### To Install (Missing)
| Library | Version | Purpose |
|---------|---------|---------|
| `@nestjs/throttler` | ^6.x | Rate limiting (100 req/min general, 5/15min auth, 10/min upload) |
| `@nestjs/terminus` | ^10.x | Health check endpoint with Postgres, Redis, disk, memory indicators |
| `@sentry/nestjs` | ^8.x | Error tracking — 5xx to Sentry, critical alerts |
| `@aws-sdk/client-s3` | ^3.x | Cloudflare R2 S3-compatible SDK |
| `@aws-sdk/s3-request-presigner` | ^3.x | Signed URL generation for R2 |
| `bullmq` | ^5.x | Background job queue (email sends, future photo processing) |
| `@nestjs/bullmq` | ^10.x | NestJS BullMQ integration |
| `@types/multer` | ^1.x | TypeScript types for file uploads |

### To Remove (Boilerplate Cruft)
| Package | Reason |
|---------|--------|
| `@casl/ability` | Replaced by simple `@Roles()` decorator + role enum |
| `mysql2` | PostgreSQL-only project; unused dependency |
| `connect-redis` | Used for Express sessions (not needed; no session auth) |
| `express-session` | Not needed; JWT-based auth |
| `@nestjs/serve-static` | Boilerplate holdover; no static file serving needed in Phase 1 |

### Installation Commands
```bash
# Add missing packages
npm install @nestjs/throttler @nestjs/terminus @sentry/nestjs \
  @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
  bullmq @nestjs/bullmq

npm install --save-dev @types/multer

# Remove unused packages
npm uninstall @casl/ability mysql2 connect-redis express-session @nestjs/serve-static
```

---

## Architecture Patterns

### Recommended Project Structure (Post-Cleanup)

```
src/
├── app/
│   ├── app.module.ts          # Root module (stripped)
│   ├── app.controller.ts      # Root controller (minimal or removed)
│   └── health/
│       ├── health.controller.ts  # @nestjs/terminus health check
│       └── health.module.ts
├── common/                    # (rename from shared/ for clarity — Claude's discretion)
│   ├── config/
│   │   ├── configuration.ts   # Config factory (PoshPet vars)
│   │   ├── env.validation.ts  # 21-var strict class-validator schema
│   │   ├── swagger.ts         # Swagger setup with BearerAuth
│   │   └── typeorm.datasource.ts  # CLI datasource (always synchronize: false)
│   ├── decorators/
│   │   ├── roles.decorator.ts    # @Roles(UserRole.FREE, UserRole.PREMIUM)
│   │   └── current-user.decorator.ts
│   ├── entities/
│   │   └── base.entity.ts     # Fixed: id, created_at, updated_at (TIMESTAMPTZ)
│   ├── filters/
│   │   ├── all-exceptions.filter.ts    # Catches all unhandled errors
│   │   └── http-exception.filter.ts   # HttpException → error response format
│   ├── guards/
│   │   └── roles.guard.ts     # Simple @Roles() check against req.user.role
│   ├── interceptors/
│   │   └── response.interceptor.ts  # { success, data, meta } envelope
│   ├── middleware/
│   │   └── logging.middleware.ts   # JSON request/response logging (keep existing)
│   ├── pipes/
│   │   └── pagination.pipe.ts      # PaginationQueryDto transformation
│   └── dto/
│       ├── pagination-query.dto.ts  # page, limit, sort, order
│       └── pagination-meta.dto.ts   # page, limit, total, total_pages, has_more
├── external/
│   ├── redis/
│   │   └── redis.module.ts    # Keep as-is (REDIS_CLIENT injection token)
│   ├── storage/
│   │   ├── storage.module.ts
│   │   ├── storage.service.ts  # BucketEnum, path builder, signed URL cache
│   │   └── dto/
│   │       └── upload.dto.ts   # UploadType enum
│   └── email/
│       ├── email.module.ts    # Register BullMQ queue
│       ├── email.service.ts   # send(EmailType, { to, params }) → enqueue
│       ├── email.processor.ts # BullMQ processor → Brevo API call
│       └── email.types.ts     # EmailType enum, template ID map
├── modules/
│   └── audit/
│       ├── audit.entity.ts    # audit_logs table
│       ├── audit.service.ts   # AuditLogService
│       └── audit.module.ts
├── migrations/
│   └── YYYYMMDD-initial-poshpet-schema.ts  # New migration after cleanup
└── main.ts                    # Bootstrap (existing, minor updates)
```

### Pattern 1: Fixed BaseEntity

The boilerplate `base.entity.ts` has swapped decorators. The fix is straightforward — swap decorator assignments and ensure TIMESTAMPTZ columns:

```typescript
// src/common/entities/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
```

Key changes from boilerplate:
- `@CreateDateColumn` → `created_at` (fixed swap)
- `@UpdateDateColumn` → `updated_at` (fixed swap)
- `type: 'timestamp with time zone'` on both (INFRA-09)
- `abstract` class (entities extend, not instantiate BaseEntity)
- No `@Entity()` decorator on the abstract base (boilerplate had it — causes TypeORM to register it as its own table)

### Pattern 2: Standardized Response Format

The existing `ResponseInterceptor` returns `{ status, success, message, payload }`. The required format is `{ success, data, meta }` for success and `{ success, error: { code, message, field? } }` for errors.

```typescript
// src/common/interceptors/response.interceptor.ts
// Success path (handled by interceptor)
return {
  success: true,
  data: responseData,       // controller return value
  meta: paginationMeta,     // only present on paginated responses
};

// Error path (handled by exception filter — interceptor never sees errors)
return {
  success: false,
  error: {
    code: 'VALIDATION_ERROR',   // from ErrorCode enum
    message: 'Email is required',
    field: 'email',             // optional, for field-level errors
  },
  // In development only:
  debug: {
    stack: error.stack,
    timestamp: new Date().toISOString(),
  },
};
```

### Pattern 3: Global Exception Filter Architecture

Two filters needed — register both in `main.ts`:

```typescript
// Registration in main.ts
app.useGlobalFilters(
  new AllExceptionsFilter(httpAdapterHost, sentryClient, emailService, configService),
  new HttpExceptionFilter(),
);
```

`AllExceptionsFilter` catches everything `HttpExceptionFilter` misses (TypeORM errors, uncaught exceptions). The branching logic:

```typescript
// Pseudocode for AllExceptionsFilter
if (status >= 500) {
  Sentry.captureException(exception);              // SEC-06
  logger.error(...);                               // SEC-06
  if (isCriticalError(exception)) {
    emailService.sendAdminAlert(exception);        // SEC-08
  }
} else {
  logger.warn(...);                               // SEC-07 (4xx local only)
}

// Dev vs prod response shape
const body = {
  success: false,
  error: { code, message, field },
  ...(isDev && { debug: { stack, timestamp } }), // locked decision
};
```

### Pattern 4: Rate Limiting with Redis Store

`@nestjs/throttler` v5+ supports Redis-backed stores. Register globally, then apply specific overrides:

```typescript
// In AppModule.imports
ThrottlerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    throttlers: [
      {
        name: 'default',
        ttl: 60000,   // 1 minute
        limit: 100,   // API-10: 100 req/min
      },
    ],
    storage: new ThrottlerStorageRedisService(redisClient),
    generateKey: (context) => {
      // Use authenticated user ID when available, fall back to IP
      const req = context.switchToHttp().getRequest();
      return req.user?.id ?? req.ip;
    },
  }),
}),

// APP_GUARD in AppModule.providers
{ provide: APP_GUARD, useClass: ThrottlerGuard },
```

Auth endpoints override with IP-based key and stricter limits:
```typescript
@Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 per 15 min (API-11)
@Post('login')
```

### Pattern 5: @nestjs/terminus Health Check

Replace the existing custom SQL health check with proper terminus indicators:

```typescript
// src/app/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: MicroserviceHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.disk.checkStorage('disk_health', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }
}
```

Redis health indicator requires a custom indicator using the injected `REDIS_CLIENT` — `@nestjs/terminus` doesn't have built-in Redis support unless using the MicroserviceHealthIndicator pattern.

### Pattern 6: StorageService with BucketEnum

```typescript
export enum Bucket {
  MEDIA = 'poshpet-media',
  CAPSULE = 'poshpet-capsules',
  STATIC = 'poshpet-static',
}

export enum UploadType {
  PHOTO = 'PHOTO',
  AVATAR = 'AVATAR',
  VET_ATTACHMENT = 'VET_ATTACHMENT',
  CIRCLE_MEDIA = 'CIRCLE_MEDIA',
  MEMORY_PAGE = 'MEMORY_PAGE',
}

@Injectable()
export class StorageService {
  private mediaClient: S3Client;   // For MEDIA and STATIC buckets
  private capsuleClient: S3Client; // Separate credentials for CAPSULE (FILE-04)

  constructor(
    private redis: Redis,
    private config: ConfigService,
  ) {
    this.mediaClient = new S3Client({
      region: 'auto',
      endpoint: config.get('storage.r2_endpoint'),
      credentials: {
        accessKeyId: config.get('storage.r2_access_key'),
        secretAccessKey: config.get('storage.r2_secret_key'),
      },
    });

    this.capsuleClient = new S3Client({
      region: 'auto',
      endpoint: config.get('storage.r2_endpoint'),
      credentials: {
        accessKeyId: config.get('storage.r2_capsule_access_key'),
        secretAccessKey: config.get('storage.r2_capsule_secret_key'),
      },
    });
  }

  buildPath(type: UploadType, ids: Record<string, string>): string {
    switch (type) {
      case UploadType.PHOTO:
        return `photos/${ids.userId}/${ids.petId}/${ids.photoId}_${ids.size}.jpg`;
      case UploadType.AVATAR:
        return `avatars/${ids.userId}/${ids.petId}_avatar.jpg`;
      case UploadType.VET_ATTACHMENT:
        return `vet-attachments/${ids.userId}/${ids.visitId}/${ids.attachmentId}.jpg`;
      case UploadType.CIRCLE_MEDIA:
        return `circle-media/${ids.circleId}/${ids.postId}/${ids.mediaId}.jpg`;
      case UploadType.MEMORY_PAGE:
        return `memory-pages/${ids.userId}/${ids.pageId}_${ids.type}`;
    }
  }

  async upload(bucket: Bucket, path: string, buffer: Buffer, mimeType: string): Promise<string> {
    const client = bucket === Bucket.CAPSULE ? this.capsuleClient : this.mediaClient;
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: buffer,
      ContentType: mimeType,
    }));
    return path;
  }

  async getSignedUrl(bucket: Bucket, path: string): Promise<string> {
    const cacheKey = `signed_url:${bucket}:${path}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const client = bucket === Bucket.CAPSULE ? this.capsuleClient : this.mediaClient;
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: path }),
      { expiresIn: 3600 }, // 1 hour
    );

    await this.redis.setex(cacheKey, 3000, url); // Cache for 50 min (FILE-03 + decision)
    return url;
  }
}
```

### Pattern 7: BullMQ Email Queue

The email system must be async. BullMQ handles retries automatically on failure:

```typescript
// EmailType enum + template ID map
export enum EmailType {
  VERIFICATION = 'VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  CAPSULE_DELIVERY = 'CAPSULE_DELIVERY',
  ACCOUNT_DELETION = 'ACCOUNT_DELETION',
  ADMIN_ALERT = 'ADMIN_ALERT',
}

// email.service.ts — only enqueues
async send(type: EmailType, payload: { to: string; params: Record<string, any> }): Promise<void> {
  await this.emailQueue.add(type, payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false, // Keep failed jobs for debugging
  });
}

// email.processor.ts — calls Brevo API with template ID
@Processor(EMAIL_QUEUE)
export class EmailProcessor {
  @Process()
  async process(job: Job<{ type: EmailType; to: string; params: Record<string, any> }>) {
    const templateId = EMAIL_TEMPLATE_IDS[job.data.type]; // From config
    await this.brevoClient.sendTransacEmail({
      to: [{ email: job.data.to }],
      templateId,
      params: job.data.params,
    });
  }
}
```

### Pattern 8: Environment Variable Schema (21 Required Vars)

```typescript
export class AppConfigDto {
  // App (3)
  @IsEnum(Environment) NODE_ENV: Environment;
  @IsNumber() @Min(1) PORT: number;
  @IsUrl() CLIENT_URL: string;

  // Database (5)
  @IsString() DB_HOST: string;
  @IsNumber() DB_PORT: number;
  @IsString() DB_USER: string;
  @IsString() DB_PASS: string;
  @IsString() DB_NAME: string;

  // Redis (2)
  @IsString() REDIS_HOST: string;
  @IsNumber() REDIS_PORT: number;

  // Cloudflare R2 — media bucket (3)
  @IsUrl() R2_ENDPOINT: string;
  @IsString() R2_ACCESS_KEY: string;
  @IsString() R2_SECRET_KEY: string;

  // Cloudflare R2 — capsule bucket (2)
  @IsString() R2_CAPSULE_ACCESS_KEY: string;
  @IsString() R2_CAPSULE_SECRET_KEY: string;

  // Brevo (3)
  @IsString() BREVO_API_KEY: string;
  @IsEmail() BREVO_SENDER_EMAIL: string;
  @IsString() BREVO_SENDER_NAME: string;

  // Sentry (1)
  @IsUrl() SENTRY_DSN: string;

  // Admin (1)
  @IsEmail() ADMIN_EMAIL: string;

  // JWT (kept for Phase 2 auth, not counted in 21 but present)
  @IsString() JWT_SECRET: string;
  // ... etc
}
```

Note: The exact 21 var count from REQUIREMENTS (INFRA-05) needs validation against final Brevo template IDs. The project may choose to store template IDs in config code (mapped from EmailType enum) rather than env vars, which is the cleaner approach.

### Anti-Patterns to Avoid

- **Synchronize: true in any environment:** Currently `synchronize: !isProduction` in `app.module.ts`. Must be always `false`. TypeORM sync silently drops columns — it has caused production data loss.
- **@Entity() on base class:** The boilerplate `BaseEntity` has `@Entity()` decorator — this registers it as its own table. Remove `@Entity()` from the abstract base.
- **Raw HTML in email templates:** Current `EmailTemplatesService` reads local `.html` files. With Brevo template IDs, all HTML lives in Brevo's editor — zero HTML in the codebase.
- **Synchronous email sends:** Current `email.service.ts` uses `await axios.post()` directly in the request cycle. Slow Brevo API will block responses. All sends must go through BullMQ queue.
- **CASL guards on routes:** The existing `CaslGuard` checks `req.session?.user` (sessions not used) and defines Organization/Task/User subjects — entirely wrong for PoshPet. Delete it entirely.
- **useGlobalFilters order matters:** `AllExceptionsFilter` must be registered BEFORE `HttpExceptionFilter` in `app.useGlobalFilters()`. NestJS applies filters in reverse registration order (last registered = first executed).
- **mysql2 in dependencies:** An unused database driver that increases attack surface. Remove it.
- **ServeStaticModule:** The boilerplate serves static files from `src/app/assets/`. This is a holdover for Swagger CSS. The Swagger CSS path should be removed or served differently — not via `ServeStaticModule` in production.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom Redis counter middleware | `@nestjs/throttler` with `ThrottlerStorageRedisService` | Sliding window, multiple throttlers, `X-RateLimit-*` headers out of box |
| Health checks | Custom SQL/Redis ping endpoints | `@nestjs/terminus` HealthCheckService | Standard format, proper HTTP 200/503 codes, multiple indicators |
| File upload size limits | Custom body parser middleware | `multer` limits in `FileInterceptor({ limits: { fileSize: 10MB } })` | Already included in `@nestjs/platform-express` |
| Signed URL caching | Manual Redis TTL calculation | Pattern: `setex(key, 3000, url)` (50 min) for 1-hour signed URLs | Race condition avoided by using TTL less than expiry |
| Error code taxonomy | Per-controller error strings | Centralized `ErrorCode` enum in exception filter | Consistent across all 140+ endpoints |
| S3 presigned URLs | Custom crypto signing | `@aws-sdk/s3-request-presigner` | AWS SigV4 is complex — library handles key rotation, encoding |
| BullMQ queue setup | Raw Redis LPUSH/BRPOP | `@nestjs/bullmq` + `BullModule.registerQueue()` | Retry, dead-letter, job events, concurrency, rate limiting built in |

---

## Common Pitfalls

### Pitfall 1: TypeORM TIMESTAMPTZ vs TIMESTAMP
**What goes wrong:** TypeORM's `@CreateDateColumn()` defaults to `TIMESTAMP` (without timezone) in PostgreSQL. Storing all times in UTC and ignoring timezone is fine for a US-only app, but PoshPet has timezone-aware cron jobs (streak reset at midnight per user timezone) — mixing TIMESTAMP and TIMESTAMPTZ causes silent errors.
**Why it happens:** TypeORM's default PostgreSQL column type for `@CreateDateColumn` is `timestamp` not `timestamptz`.
**How to avoid:** Explicitly declare `type: 'timestamp with time zone'` on all date columns in BaseEntity. All entities inheriting BaseEntity will get TIMESTAMPTZ columns automatically.
**Warning signs:** Migration SQL shows `TIMESTAMP NOT NULL` instead of `TIMESTAMPTZ NOT NULL` — like the existing migration in the codebase.

### Pitfall 2: boilerplate synchronize: !isProduction
**What goes wrong:** In development, TypeORM automatically alters tables to match entity definitions. This drops columns, renames columns, and causes data loss. Worse, it trains developers to not write migrations — then production deploy fails.
**Why it happens:** Boilerplate convenience setting left in production code.
**How to avoid:** Set `synchronize: false` unconditionally. Always use `npm run db:migration:generate` + `npm run db:migration:run`.
**Warning signs:** Running the app without a migration and seeing database changes "just work."

### Pitfall 3: Cloudflare R2 endpoint format
**What goes wrong:** R2 S3-compatible endpoint is `https://<account_id>.r2.cloudflarestorage.com` — NOT a standard AWS endpoint. Using the wrong endpoint format silently fails with auth errors.
**Why it happens:** Developers configure `endpoint: 'https://s3.amazonaws.com'` from muscle memory.
**How to avoid:** The R2 endpoint MUST be set from Cloudflare dashboard → R2 → Bucket → Settings → S3 API endpoint. Cloudflare provides the exact URL. Set `region: 'auto'` (required for R2 — not a real AWS region).
**Warning signs:** `SignatureDoesNotMatch` errors or `NoSuchBucket` when the bucket definitely exists.

### Pitfall 4: BullMQ + Redis version compatibility
**What goes wrong:** BullMQ v5+ requires Redis 6.2+ (for `LMPOP` command). The Docker Compose uses Redis 7 — compatible. But if the Redis connection config uses wrong auth settings (ioredis vs BullMQ has different connection config shapes), the queue silently fails to initialize.
**Why it happens:** BullMQ takes its own `IORedis` connection config object, separate from the existing `REDIS_CLIENT` ioredis instance.
**How to avoid:** BullMQ must be configured with its own Redis connection, not by reusing the shared `REDIS_CLIENT` token directly. Use `BullModule.forRootAsync()` with the same Redis env vars.
**Warning signs:** Queue workers registered but `process()` never called; no job failures logged.

### Pitfall 5: Sentry NestJS SDK initialization order
**What goes wrong:** Sentry must be initialized BEFORE `NestFactory.create()`. If `SentryModule` is imported inside `AppModule`, it initializes after the app bootstraps, missing any bootstrap-time errors.
**Why it happens:** Developers follow NestJS module patterns and put Sentry in `AppModule.imports` which is too late.
**How to avoid:** Call `Sentry.init({ dsn: process.env.SENTRY_DSN, ... })` in `main.ts` BEFORE `NestFactory.create()`.
**Warning signs:** Sentry dashboard shows events for app errors but never shows bootstrap errors.

### Pitfall 6: @nestjs/throttler APP_GUARD vs per-route decorator
**What goes wrong:** Registering `ThrottlerGuard` as `APP_GUARD` applies rate limiting globally including health check endpoints and OPTIONS requests, causing misleading rate limit errors in monitoring.
**Why it happens:** Global guard is simplest to configure.
**How to avoid:** Exclude the health check path from throttling using `@SkipThrottle()` decorator on the `HealthController`. For OPTIONS (CORS preflight), NestJS handles these before guards.
**Warning signs:** Health monitoring system triggers rate limit alerts at startup.

### Pitfall 7: CASL + organizations cleanup dependency order
**What goes wrong:** TypeScript compile errors and circular imports if you delete files without following the dependency graph.
**Why it happens:** Multiple modules import from the organizations and auth modules.
**How to avoid:** Delete in this order:
1. Remove `OrganizationsModule` from `AppModule` imports
2. Delete `src/modules/organizations/` directory
3. Remove `organization_id` FK from `UserRoles` entity
4. Remove CASL guard and factory files
5. Remove `@casl/ability` from package.json
6. Only then run TypeScript compiler to find remaining import errors
**Warning signs:** `Cannot find module` errors in a seemingly random order.

### Pitfall 8: Brevo template ID vs HTML approach
**What goes wrong:** The existing `EmailTemplatesService` reads local `.html` files and does regex replacements for variables. Brevo's API template approach requires template IDs (integers) and `params` object. The two approaches are fundamentally incompatible — you can't hybrid them.
**Why it happens:** Boilerplate used a generic email system; Brevo API templates are the required pattern.
**How to avoid:** Delete `email-templates.service.ts` and the `templates/` directory entirely. Build `email.service.ts` from scratch using the Brevo SDK's `sendTransacEmail` with `templateId` + `params`. Template IDs are set up in the Brevo dashboard and stored in config.
**Warning signs:** If you see local `.html` files being read anywhere in the email flow, you're on the wrong path.

---

## Code Examples

### Exception Filter Error Response (API-05, API-06)
```typescript
// src/common/filters/all-exceptions.filter.ts
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  UNPROCESSABLE = 'UNPROCESSABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isDev = process.env.NODE_ENV === 'development';

    let status = 500;
    let code = ErrorCode.INTERNAL_ERROR;
    let message = 'Internal server error';
    let field: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResp = exception.getResponse() as any;
      message = Array.isArray(exResp?.message) ? exResp.message[0] : exResp?.message ?? message;
      field = exResp?.field;
      code = HTTP_STATUS_TO_ERROR_CODE[status] ?? ErrorCode.INTERNAL_ERROR;
    }

    // 5xx → Sentry + possible admin email (SEC-06, SEC-08)
    if (status >= 500) {
      Sentry.captureException(exception);
      if (isCriticalError(exception)) {
        this.emailService.send(EmailType.ADMIN_ALERT, {
          to: this.configService.get('adminEmail'),
          params: { error: message, timestamp: new Date().toISOString() },
        });
      }
    }

    const body: any = {
      success: false,
      error: { code, message, ...(field && { field }) },
    };

    if (isDev) {
      body.debug = {
        stack: exception instanceof Error ? exception.stack : undefined,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    response.status(status).json(body);
  }
}
```

### Pagination DTO + Meta (API-07, API-08, API-09)
```typescript
// src/common/dto/pagination-query.dto.ts
export class PaginationQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20;

  @IsOptional()
  @IsString()
  sort: string = 'created_at';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC';
}

// Pagination meta in response
export class PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;

  static from(page: number, limit: number, total: number): PaginationMeta {
    return {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_more: page * limit < total,
    };
  }
}
```

### Audit Log Entity (SEC-14)
```typescript
// src/modules/audit/audit.entity.ts
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  action: string; // 'LOGIN', 'LOGOUT', 'PASSWORD_RESET', 'DELETE_PET', etc.

  @Column({ type: 'uuid', nullable: true })
  actor_id: string; // user_id performing the action

  @Column({ type: 'varchar', length: 100 })
  resource: string; // 'user', 'pet', 'admin_user', etc.

  @Column({ type: 'uuid', nullable: true })
  resource_id: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp: Date;

  // 90-day retention: implement via cron job (Phase scheduling) or PostgreSQL partition
}
```

### TypeORM Datasource (always synchronize: false)
```typescript
// src/common/config/typeorm.datasource.ts
const typeormDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'postgres',
  entities: [/* explicit list — no glob in datasource */],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
  migrationsTableName: 'poshpet_migrations',
  synchronize: false, // ALWAYS false — no exceptions
  logging: ['error', 'warn'],
});
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Per-controller try/catch error handling | Global exception filters | `app.useGlobalFilters()` — already planned |
| HTML email templates in codebase | Brevo template IDs + params | Zero HTML in NestJS code |
| Synchronous email sends in request cycle | BullMQ async queue | Non-blocking, retry on failure |
| CASL for RBAC | Simple `@Roles()` enum guard | Appropriate for 3-tier model (free/premium/superadmin) |
| `synchronize: true` for development | Always `synchronize: false` | Entity-first + migration generation workflow |
| Session-based auth | JWT access + Redis refresh tokens | Already in boilerplate (correct) |

**Deprecated/outdated in this codebase:**
- `connect-redis` + `express-session`: These are Express session middleware, not needed in a JWT-based API. They're in `package.json` but appear unused in code. Remove.
- `@nestjs/serve-static`: Used in the boilerplate for serving Swagger CSS. Not needed in Phase 1; Swagger has a `customCssUrl` that can point to a CDN.
- Raw axios for Brevo: The existing `email.service.ts` uses `axios` with manual headers instead of the `brevo` SDK that's already installed.
- CASL factory: `casl.factory.ts` defines organization-scoped permissions (Manager can manage Tasks in their organization). Completely wrong model for PoshPet.

---

## Open Questions

1. **21 exact env vars vs. Brevo template ID storage**
   - What we know: INFRA-05 requires 21 env vars. The current env validation has ~13. R2 adds 5 (endpoint + 4 credentials). Sentry adds 1. Admin email adds 1. That's ~20 without Brevo template IDs.
   - What's unclear: Should Brevo template IDs (5 types × 1 integer each) be env vars or hardcoded config constants mapped from `EmailType` enum?
   - Recommendation: Store template IDs as config constants in `email.types.ts` (not env vars). Template IDs don't change between dev/staging/prod — they're design-time constants. This also avoids leaking the "21" count requirement. The planner should confirm this interpretation.

2. **Redis health indicator approach in terminus**
   - What we know: `@nestjs/terminus` doesn't have a built-in `RedisHealthIndicator` class.
   - What's unclear: The terminus docs suggest a `MicroserviceHealthIndicator` or custom `HealthIndicator` for Redis.
   - Recommendation: Create a custom `RedisHealthIndicator` that extends `HealthIndicator` and calls `redis.ping()` — approximately 10 lines. Terminus custom indicator pattern is well-documented.

3. **Capsule bucket separate credentials — same R2 account or separate?**
   - What we know: FILE-04 requires "separate IAM credentials" for the capsule bucket. Cloudflare R2 supports per-bucket API tokens.
   - What's unclear: The CONTEXT.md says "separate IAM credentials" — this could mean same R2 account with different bucket-scoped API tokens, or a completely separate R2 account.
   - Recommendation: Treat as separate R2 API tokens (bucket-level scope) within the same Cloudflare account. This is the simpler Cloudflare-native approach. Two env vars (`R2_CAPSULE_ACCESS_KEY` + `R2_CAPSULE_SECRET_KEY`) alongside the main credentials.

4. **audit_logs 90-day retention mechanism**
   - What we know: SEC-14 requires 90-day retention and queryability. The table must be created in Phase 1.
   - What's unclear: The actual cleanup mechanism — a cron job (Phase 3+) or PostgreSQL table partitioning.
   - Recommendation: Create the table in Phase 1 migrations. Add a `/* TODO: add cron job in Phase 3 */` comment. The deletion cron can be added when the cron infrastructure is built. No partitioning for Phase 1 — overkill for a startup.

5. **TypeORM app.module.ts autoLoadEntities vs explicit entity list**
   - What we know: `autoLoadEntities: true` is in `app.module.ts` and works for the NestJS app. The TypeORM CLI datasource uses an explicit entity list (required for CLI to work without NestJS DI).
   - What's unclear: After cleanup, the datasource will need the `audit_logs` entity added manually.
   - Recommendation: Keep `autoLoadEntities: true` in `app.module.ts`. Maintain the explicit entity list in `typeorm.datasource.ts` only (for CLI). Document this dual-maintenance requirement.

---

## Boilerplate Inventory: What to Keep, Change, Delete

### Keep As-Is
| File | Status | Notes |
|------|--------|-------|
| `src/main.ts` | Keep, minor edits | Add Sentry.init() before NestFactory.create(); fix CORS origins |
| `src/external/redis/redis.module.ts` | Keep | REDIS_CLIENT global injection pattern is correct |
| `src/shared/middleware/logging/logging.middleware.ts` | Keep | Comprehensive JSON logging with sensitive field masking |
| `src/shared/config/swagger.ts` | Keep, minor edits | Add Bearer token auth scheme; update title |
| `src/shared/domain/base.repository.ts` | Keep, extend | Add sort/order support, update PaginationResult to include has_more |
| `docker/docker-compose.dev.yaml` | Keep, rename | Rename "enterprise" → "poshpet" in container names and DB name |
| `package.json` scripts | Keep all | TypeORM CLI migration scripts are already correct |

### Fix (Bug or Wrong Pattern)
| File | Issue | Fix |
|------|-------|-----|
| `src/shared/domain/base.entity.ts` | `@CreateDateColumn` on `updatedAt`, `@UpdateDateColumn` on `createdAt`; no `abstract`; has `@Entity()` on base | Swap decorators; rename fields to `created_at`/`updated_at`; make abstract; add `type: 'timestamp with time zone'`; remove `@Entity()` |
| `src/app/app.module.ts` | `synchronize: !isProduction`; imports OrganizationsModule; includes ServeStaticModule | Always `synchronize: false`; remove OrganizationsModule; remove ServeStaticModule |
| `src/app/health/health.controller.ts` | Custom SQL health check, no @nestjs/terminus | Replace with TerminusModule indicators |
| `src/shared/config/env.validation.ts` | Only validates 13 vars; BREVO vars are optional; no R2/Sentry/admin email | Expand to all 21 required vars; make all critical vars `@IsDefined()` |
| `src/shared/config/configuration.ts` | Missing R2, Sentry, admin email config sections | Add storage, sentry, adminEmail config objects |
| `src/shared/config/typeorm.datasource.ts` | References all boilerplate entities; table named "enterprise_migrations" | Remove boilerplate entities; rename to "poshpet_migrations" |
| `src/shared/interceptors/response/response.interceptor.ts` | Returns `{ status, success, message, payload }` format | Rewrite to `{ success, data, meta? }` format |
| `src/external/email/email.service.ts` | Synchronous axios calls; raw HTML; no BullMQ | Rewrite to enqueue on BullMQ queue |
| `src/external/email/email-templates.service.ts` | Reads local HTML files | Delete entirely |

### Delete Entirely
| File/Directory | Reason |
|----------------|--------|
| `src/modules/organizations/` | Boilerplate enterprise feature, not used in PoshPet |
| `src/modules/auth/infrastructure/factories/casl.factory.ts` | CASL replaced by simple @Roles() guard |
| `src/shared/guards/casl/casl.guard.ts` | CASL replaced |
| `src/shared/guards/casl/casl.guard.spec.ts` | CASL replaced |
| `src/shared/decorators/abilities.decorator.ts` | CASL-specific decorator |
| `src/shared/types/auth.types.ts` | CASL-specific types; will be replaced by UserRole enum |
| `src/modules/user/core/entities/role.entity.ts` | Complex DB-backed role system; replace with simple UserRole enum |
| `src/modules/user/core/entities/permission.entity.ts` | CASL-specific entity |
| `src/modules/user/core/entities/user_role.entity.ts` | Junction table for old role system |
| `src/seeds/authroritzation.seed.ts` | Seeds CASL roles/permissions |
| `src/migrations/1768566732361-InitialSchema.ts` | Based on boilerplate schema; write new migration |

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `/home/kratos/Desktop/Nuclear Codes/mercury_sols/PoshPet/src/` — Full boilerplate codebase inspected
- `/home/kratos/Desktop/Nuclear Codes/mercury_sols/PoshPet/package.json` — Exact installed packages and versions
- `/home/kratos/Desktop/Nuclear Codes/mercury_sols/PoshPet/.planning/research/stack-research.md` — Prior stack research
- `/home/kratos/Desktop/Nuclear Codes/mercury_sols/PoshPet/.planning/research/files-research.md` — Prior file storage research (Sharp, AWS SDK, BullMQ)
- `/home/kratos/Desktop/Nuclear Codes/mercury_sols/PoshPet/.planning/research/auth-research.md` — Prior auth research

### Secondary (MEDIUM confidence — training data verified against package.json)
- `@nestjs/throttler` v5+ — ThrottlerStorageRedisService API, multiple throttler configs, APP_GUARD pattern
- `@nestjs/terminus` v10 — TerminusModule, HealthCheckService, TypeOrmHealthIndicator, custom Redis indicator
- `@aws-sdk/client-s3` v3 — S3Client constructor with endpoint override for R2, PutObjectCommand, GetObjectCommand
- `@aws-sdk/s3-request-presigner` — `getSignedUrl()` function signature with expiresIn option
- `@sentry/nestjs` v8 — `Sentry.init()` before NestFactory, SentryInterceptor, `captureException()`
- `bullmq` v5 + `@nestjs/bullmq` — `BullModule.registerQueue()`, `@Process()` processor, job options (attempts, backoff)
- Brevo SDK v1.0.0 (installed) — `sendTransacEmail()` with `templateId` + `params` pattern

### Tertiary (LOW confidence — training data only, verify before implementing)
- `@nestjs/throttler` exact version of `ThrottlerStorageRedisService` — validate that it works with ioredis v5
- Redis health indicator custom implementation — verify terminus custom indicator API hasn't changed in v10+
- R2 exact endpoint format — must be verified from Cloudflare dashboard (account-specific URL)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages verified against existing package.json; missing packages confirmed absent
- Architecture: HIGH — based on direct codebase inspection; patterns match NestJS official conventions
- Pitfalls: HIGH — base.entity.ts bug confirmed by reading the file; synchronize bug confirmed; other pitfalls are established NestJS patterns
- Boilerplate inventory: HIGH — every file in scope was directly read

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (stable NestJS/TypeORM ecosystem; R2 API unlikely to change)

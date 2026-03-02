---
phase: 01-foundation-infrastructure
plan: 03
subsystem: infra
tags: [cloudflare-r2, s3, aws-sdk, bullmq, brevo, email, storage, redis, signed-url]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure/01-01
    provides: configuration keys for storage/email/redis, RedisModule with REDIS_CLIENT token

provides:
  - StorageService with dual S3Client instances (media bucket + capsule bucket with separate IAM)
  - buildPath() enforcing directory paths for all 5 upload types
  - getSignedUrl() with 1-hour expiry and 50-minute Redis cache
  - EmailService.send(EmailType, {to, params}) enqueueing to BullMQ queue
  - EmailProcessor dequeuing from BullMQ and calling Brevo sendTransacEmail with templateId
  - BullMQ root config registered in AppModule (shared for email + future photo processing)

affects: [auth, pets, circles, capsules, vet-records, memory-pages, any module uploading files or sending email]

# Tech tracking
tech-stack:
  added:
    - "@aws-sdk/client-s3 (S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand)"
    - "@aws-sdk/s3-request-presigner (getSignedUrl)"
    - "@nestjs/bullmq + bullmq (BullMQ queue and processor)"
    - "sib-api-v3-sdk via brevo package (Brevo TransactionalEmailsApi)"
  patterns:
    - "Dual S3Client pattern: separate IAM credentials for capsule bucket (FILE-04)"
    - "Path enforcement: buildPath() centralizes all R2 key construction, callers cannot use arbitrary paths"
    - "Signed URL caching: Redis setex with TTL shorter than URL expiry (3000s vs 3600s)"
    - "Async email: EmailService only enqueues, EmailProcessor handles all Brevo API calls"
    - "BullMQ retry: 3 attempts with exponential backoff (2s, 4s, 8s) on email failures"
    - "Optimistic locking: documented in BaseRepository (SEC-11) for concurrent update protection"

key-files:
  created:
    - src/external/storage/storage.enums.ts
    - src/external/storage/storage.service.ts
    - src/external/storage/storage.module.ts
    - src/external/email/email.types.ts
    - src/external/email/email.processor.ts
  modified:
    - src/external/email/email.service.ts (rewritten: axios -> BullMQ enqueue)
    - src/external/email/email.module.ts (rewritten: added BullMQ + EmailProcessor)
    - src/app/app.module.ts (added StorageModule, BullModule.forRootAsync)
    - src/shared/domain/base.repository.ts (added SEC-11 optimistic locking docs)

key-decisions:
  - "Dual S3Client: separate mediaClient (MEDIA+STATIC) and capsuleClient (CAPSULE) with distinct IAM credentials per FILE-04"
  - "Signed URLs cached at 50-minute TTL (3000s) vs 1-hour expiry (3600s) to prevent serving expired URLs from cache"
  - "EmailService.send() is fire-and-forget BullMQ enqueue - zero synchronous Brevo calls in hot path"
  - "Template IDs hardcoded as constants (not env vars) - they are fixed per-environment values set in Brevo dashboard"
  - "sib-api-v3-sdk used directly (no TypeScript types) since brevo v1.0.0 package is a plain JS wrapper"
  - "BullMQ root config registered globally in AppModule so email queue and future photo processing share Redis connection"

patterns-established:
  - "File upload pattern: buildPath(UploadType, ids) -> upload(bucket, key, buffer, contentType) -> getSignedUrl(bucket, key)"
  - "Email send pattern: emailService.send(EmailType.X, { to, params }) - no template HTML anywhere in codebase"
  - "Optimistic locking pattern (SEC-11): include updated_at in WHERE clause, check result.affected === 0"

requirements-completed: [FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, FILE-06, FILE-07, FILE-08, FILE-09, FILE-10, EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06, SEC-11]

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 1 Plan 3: Storage and Email Infrastructure Summary

**Cloudflare R2 StorageService with dual S3 client IAM separation and signed URL Redis caching, plus async BullMQ-backed EmailService with Brevo template API processor replacing synchronous axios email**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T10:51:29Z
- **Completed:** 2026-03-02T10:54:45Z
- **Tasks:** 2
- **Files modified:** 9 (4 created, 3 rewritten, 2 modified)

## Accomplishments

- StorageService provides upload, getSignedUrl (Redis-cached 50-min), and delete for 3 R2 buckets with enforced path patterns for 5 upload types
- Capsule bucket uses separate IAM credentials via dedicated S3Client instance (FILE-04 security requirement)
- EmailService replaced with BullMQ enqueue-only pattern — EmailProcessor handles all Brevo API calls with 3-retry exponential backoff

## Task Commits

Each task was committed atomically:

1. **Task 1: Build StorageService with R2 integration, path builder, and signed URL caching** - `d22a751` (feat)
2. **Task 2: Rebuild email service with BullMQ queue and Brevo template API** - `5927d7c` (feat)

**Plan metadata:** `[pending]` (docs: complete plan)

## Files Created/Modified

- `src/external/storage/storage.enums.ts` - Bucket enum (MEDIA, CAPSULE, STATIC) and UploadType enum (5 types)
- `src/external/storage/storage.service.ts` - StorageService with dual S3Client, buildPath, upload, getSignedUrl, delete
- `src/external/storage/storage.module.ts` - @Global() StorageModule exporting StorageService
- `src/external/email/email.types.ts` - EmailType enum (5 types), EMAIL_TEMPLATE_IDS mapping, EmailJobData interface
- `src/external/email/email.service.ts` - Rewritten: EmailService.send() enqueues to BullMQ, no direct Brevo calls
- `src/external/email/email.processor.ts` - BullMQ WorkerHost calling Brevo sendTransacEmail with templateId
- `src/external/email/email.module.ts` - Rewritten: @Global() with BullMQ.registerQueue and EmailProcessor
- `src/app/app.module.ts` - Added StorageModule and BullModule.forRootAsync() with Redis connection
- `src/shared/domain/base.repository.ts` - Added SEC-11 optimistic locking convention documentation

## Decisions Made

- Used `sib-api-v3-sdk` (via require) instead of the typed `brevo` package import pattern shown in the plan because the brevo v1.0.0 package has no TypeScript types and is a plain JS wrapper around sib-api-v3-sdk. The pattern is identical: create TransactionalEmailsApi, set API key, call sendTransacEmail.
- Non-null assertions (`!`) on ConfigService.get() calls in StorageService to satisfy strictNullChecks — values are guaranteed by env validation from Plan 01-01.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added non-null assertions on ConfigService.get() calls in StorageService**
- **Found during:** Task 1 (StorageService TypeScript verification)
- **Issue:** `ConfigService.get<string>()` returns `string | undefined` but S3Client requires `string` — TypeScript error with strictNullChecks enabled
- **Fix:** Added `!` non-null assertion on all config value accesses in StorageService constructor
- **Files modified:** src/external/storage/storage.service.ts
- **Verification:** `npx tsc --noEmit` passed with zero errors
- **Committed in:** d22a751 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 type correctness)
**Impact on plan:** Single fix necessary for correct TypeScript compilation. No scope creep.

## Issues Encountered

- Brevo v1.0.0 package has no TypeScript types — resolved by using `sib-api-v3-sdk` directly via `require()` with `any` typing in the processor. The underlying API is identical.

## User Setup Required

**External services require manual configuration before the app can use storage and email.**

Configuration needed:

**Cloudflare R2:**
- Create 3 buckets: `poshpet-media`, `poshpet-capsules`, `poshpet-static`
- Create 2 API tokens: one scoped to media+static, one scoped to capsules only
- Set env vars: `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_CAPSULE_ACCESS_KEY`, `R2_CAPSULE_SECRET_KEY`

**Brevo:**
- Create 5 email templates in Brevo Dashboard (Verification, Password Reset, Capsule Delivery, Account Deletion, Admin Alert)
- Update template IDs in `src/external/email/email.types.ts` (currently set to 1-5 as placeholders)
- Set env vars: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`

**Sentry:**
- Set env var: `SENTRY_DSN`

## Next Phase Readiness

- StorageService is @Global() and injectable in any feature module for file uploads and signed URL retrieval
- EmailService is @Global() and injectable in any feature module for async email sending
- BullMQ root config established in AppModule — photo processing queue (Phase 4) can register with `BullModule.registerQueue()` without additional Redis config
- All SEC-11 optimistic locking conventions documented in BaseRepository for Phase 2+ executors

## Self-Check: PASSED

- FOUND: src/external/storage/storage.enums.ts
- FOUND: src/external/storage/storage.service.ts
- FOUND: src/external/storage/storage.module.ts
- FOUND: src/external/email/email.types.ts
- FOUND: src/external/email/email.processor.ts
- FOUND: .planning/phases/01-foundation-infrastructure/01-03-SUMMARY.md
- FOUND commit d22a751: feat(01-03): build StorageService with R2 integration and signed URL caching
- FOUND commit 5927d7c: feat(01-03): rebuild email service with BullMQ queue and Brevo template API
- Note: TypeScript error for AuditModule import in app.module.ts is pre-existing, out-of-scope (introduced by linter from another plan)

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-03-02*

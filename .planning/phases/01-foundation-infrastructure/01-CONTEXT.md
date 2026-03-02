# Phase 1: Foundation & Infrastructure - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean up the existing NestJS boilerplate, set up PostgreSQL 16 + Redis 7 via Docker Compose, and establish all cross-cutting concerns: API conventions (response format, validation, pagination, rate limiting, Swagger), security baseline (CORS, bcrypt, Sentry, logging, ownership scoping), file storage (Cloudflare R2 with 3 buckets), and transactional email (Brevo). This phase delivers the foundation that every feature module in Phases 2-7 depends on.

</domain>

<decisions>
## Implementation Decisions

### Boilerplate cleanup
- Aggressive strip-down: gut everything to bare NestJS, remove all boilerplate modules (CASL, organizations, broken base.entity.ts), rebuild only what Phase 1 needs from scratch
- Shared abstract base entity class with id (UUID), created_at (@CreateDateColumn), updated_at (@UpdateDateColumn) — all 36 entities extend it
- Strict environment variable validation on boot — app crashes immediately if any of the 21 required vars are missing or invalid, using class-validator on a config schema
- Entity-first migration workflow: define entities in code, use TypeORM CLI to auto-generate migration files from diffs (synchronize: false in all environments)

### Error responses & logging
- Dev-only debug fields in error responses: in development, include a 'debug' object with stack trace, query info, request context. Production returns only the clean error format ({ success, error: { code, message, field? } })
- Critical failures (DB down, Stripe webhook failures, encryption errors) trigger both Sentry alert AND admin email via Brevo — dual notification channel
- Structured request/response logging via NestJS interceptor: method, path, status code, duration, user ID in JSON format. Sensitive fields (passwords, tokens) are omitted
- Separate audit_logs database table for auth events, data access, and admin actions with 90-day retention. Columns: action, actor, resource, timestamp, IP. Queryable for compliance (SEC-14)

### File storage (Cloudflare R2)
- Single StorageService with bucket enum (MEDIA, CAPSULE, STATIC). One service class, internally uses different IAM credentials for the capsule bucket (FILE-04)
- Backend proxy upload flow: client sends file to NestJS via multipart/form-data, backend validates (size, type, rate limit) then uploads to R2. No presigned upload URLs
- StorageService enforces directory path construction: pass upload type + IDs, service constructs the correct path. E.g., upload(PHOTO, { userId, petId, photoId, size }) -> photos/{user}/{pet}/{photo_id}_{size}.jpg
- Redis-cached signed URLs with TTL slightly less than 1-hour expiry (~50 min). Cache invalidated on file update/delete

### Email service (Brevo)
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

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The requirements doc (60+ requirements for this phase) provides comprehensive technical specs.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-infrastructure*
*Context gathered: 2026-03-02*

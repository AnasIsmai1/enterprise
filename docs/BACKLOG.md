# Backlog

Ordered roughly by what blocks what. See [AUDIT.md](./AUDIT.md) for how these
were found.

---

## 1-5. Closed

Auth, organizations, invitations, tenancy, logging, audit, GDPR, and lint are all
done. See [AUDIT.md](./AUDIT.md) §8 for what changed and how it was verified.

- [x] **Auth** — better-auth 1.6.26: signup, email verification, sign-in/out,
      password reset, sessions. [AUTH.md](./AUTH.md)
- [x] **Organizations + invitations** — full lifecycle via the organization plugin
- [x] **Tenancy enforced and proven** — `@ActiveOrganization()`, the service-layer
      pattern, and a reference module. [TENANCY.md](./TENANCY.md)
- [x] **Reference CRUD module** — `src/modules/project/`, org-scoped, paginated,
      audited, with tests that fail if the tenant filter is dropped
- [x] **Audit log wired** — `USER_CREATED`, `SESSION_CREATED`, `USER_DELETED` via
      better-auth `databaseHooks`; resource mutations from the service layer
- [x] **Structured logging** — pino replaces ~450 lines of hand-rolled middleware
      and interceptor; JSON in production, pretty in dev, `X-Request-ID`
      correlation, credentials redacted, health probes excluded
- [x] **Auth rate limits** — 5 sign-ins/min, 10 signups/hour, 5 resets/hour,
      backed by Redis so they hold across replicas. Verified: 6th attempt → 429
- [x] **GDPR** — `GET /api/v1/account/export` (Art. 15/20) and better-auth's
      email-confirmed `delete-user` (Art. 17)
- [x] **Lint at zero** — 87 → 0, and `pnpm lint:check` now gates CI
- [x] **e2e suite runs** — config was malformed JSON; 4 tests green
- [x] **Health probe** — 150MB heap ceiling would have flapped in production;
      now configurable, plus a dependency-free `/health/live`

Still open in this area:

- [ ] Social login — `socialProviders` is wired but empty (needs OAuth client
      credentials)
- [ ] 2FA — `better-auth/plugins/two-factor` available, unused
- [ ] Teams and dynamic per-org roles — plugin options exist, disabled
- [ ] Postgres row-level security. The tenant filter is application-level, so a
      hand-written raw query can still bypass it
- [ ] Log sink. pino writes structured JSON to stdout; nothing ships it yet.
      Sentry Logs / Better Stack / CloudWatch — a config choice, not code
- [ ] Prometheus metrics. `@nestjs/terminus` is wired; no `/metrics` endpoint
- [ ] `AuditLog` does not extend `BaseEntity`; it redefines id and timestamps
- [ ] `StorageService.buildPath()` still encodes pet-domain path shapes
- [ ] Test coverage thresholds are not enforced

## 6. Toolchain follow-ups

Deliberately held back from the dependency pass — each is a major:

- [ ] **TypeScript 7** (7.0.2). The native compiler; type-checking is an order of
      magnitude faster, which matters because `pnpm build` still runs `tsc`.
      Blocked on `typescript-eslint` support
- [ ] **ESLint 10** (10.8.1) — flat config is already in place, so the migration
      should be small
- [ ] **TypeORM 1.x** (1.1.0) — first stable major after years on `0.3.x`. Read
      the migration guide before attempting
- [ ] **BullMQ 6**, **ioredis 6**
- [ ] `tsconfig.json`: turn on `noImplicitAny` and `strictBindCallApply`, then fix
      the fallout. Currently both are off, so `strictNullChecks` is doing most of
      the work alone
- [x] ~~Docker compose Postgres port collision~~ — host binding is now
      `${DB_PORT:-5433}`, with the container internally pinned to 5432

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
- [x] ~~Zero-downtime unproven~~ — verified on a single-node swarm: 2,998
      requests across a rolling update, 0 failures, `start-first` confirmed
- [ ] Log sink. pino writes structured JSON to stdout with rotation; nothing
      ships it off-box yet. Sentry Logs / Better Stack / Loki — a config choice
- [ ] Prometheus metrics. `@nestjs/terminus` is wired; no `/metrics` endpoint
- [ ] `AuditLog` does not extend `BaseEntity`; it redefines id and timestamps
- [ ] `StorageService.buildPath()` still encodes pet-domain path shapes
- [ ] Redis has no password. It sits on an `internal: true` network with no
      published port, so network isolation is the control — but the three
      `new Redis(...)` sites would all need a `REDIS_PASSWORD` if that changes
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

## 7. Deployment (added with the Swarm migration)

Production is a single-node Docker Swarm stack — see
[DEPLOYMENT.md](./DEPLOYMENT.md). Closed in that pass:

- [x] ~~Prod healthcheck probed a 404~~ — `/health` and `/health/live` are now
      outside the API prefix and unversioned; the container can actually report
      healthy, which rolling updates depend on
- [x] ~~`trust proxy` unset~~ — `TRUST_PROXY_HOPS`; without it every client
      behind Caddy shared one rate-limit bucket
- [x] ~~Redis unpersisted~~ — AOF + volume, in both environments
- [x] ~~Dev Redis on `allkeys-lru`~~ — `noeviction`, which BullMQ requires
- [x] ~~Postgres and Redis published on all interfaces~~ — only 80/443 now
- [x] ~~No log rotation~~ — 10m × 3 on every service
- [x] ~~Migrations raced across replicas~~ — moved to a pre-deploy step
- [x] ~~Prod built from source and ignored the ghcr image~~ — pulls by tag;
      CI publishes on `dev`
- [x] ~~GDPR deletion email had no confirmation link~~
- [x] ~~`pnpm dev:setup prod` pointed at a nonexistent file~~
- [x] ~~`develop.watch` watched `package-lock.json` in a pnpm repo~~

Open:

- [ ] Confirm PITR is enabled on the managed Postgres provider. This stack has
      no backup of its own, by design
- [ ] Add a free external uptime check. Uptime Kuma runs on the box it watches
      and cannot report that the box is down
- [x] ~~Watchtower held the docker socket directly~~ — `tecnativa/docker-socket-proxy`
      now holds it and exposes read-only container/image endpoints only

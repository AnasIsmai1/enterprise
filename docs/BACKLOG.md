# Backlog

What this boilerplate does not do yet. Ordered roughly by what blocks what.

---

## Auth and tenancy

- [ ] Social login — `socialProviders` is wired but empty (needs OAuth client
      credentials)
- [ ] 2FA — `better-auth/plugins/two-factor` available, unused
- [ ] Teams and dynamic per-org roles — plugin options exist, disabled
- [ ] Postgres row-level security. The tenant filter is application-level, so a
      hand-written raw query can still bypass it

## Observability

- [ ] Log sink. pino writes structured JSON to stdout with rotation; nothing
      ships it off-box yet. Sentry Logs / Better Stack / Loki — a config choice
- [ ] Prometheus metrics. `@nestjs/terminus` is wired; no `/metrics` endpoint
- [ ] Add a free external uptime check. Uptime Kuma runs on the box it watches
      and cannot report that the box is down

## Hardening

- [ ] `AuditLog` does not extend `BaseEntity`; it redefines id and timestamps
- [ ] Redis has no password. It sits on an `internal: true` network with no
      published port, so network isolation is the control — but the three
      `new Redis(...)` sites would all need a `REDIS_PASSWORD` if that changes
- [ ] Test coverage thresholds are not enforced
- [ ] Confirm PITR is enabled on the managed Postgres provider. This stack has
      no backup of its own, by design

## Toolchain

Each is a major, deliberately held back:

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

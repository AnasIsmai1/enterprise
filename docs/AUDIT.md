# Codebase Audit — 2026-08-10

Three passes are recorded here:

1. **Dependencies, toolchain, migrations, existing auth defects** (sections 1-5).
2. **better-auth migration + carried-over critical fixes** (section 7).
3. **Tenancy, logging, audit, GDPR, rate limits, lint to zero** (section 8).

---

## 1. What this repository actually was

A NestJS 11 boilerplate carrying two identities at once:

- Package identity: `enterprise` (EagleAnalytix).
- Content identity: **PoshPet**, a consumer pet-care app — swagger title,
  migrations table name (`poshpet_migrations`), R2 bucket names
  (`poshpet-media`, `poshpet-capsules`), seed data, and a 3,700-line `.planning/`
  tree describing pets, streaks, Time Capsules and Stripe subscriptions.

Auth consisted of four endpoints — `signin`, `me`, `refresh`, `logout`. There was
no signup, no email verification, no password reset, no organizations, and no
invitations. `UserController` was an empty class. `UserService` had one method.
The `UserOtp` entity existed but nothing in the codebase created or read an OTP.

**The database schema did not exist.** `synchronize` is `false` everywhere and
`src/migrations/` contained only `.gitkeep`, so a fresh deployment booted against
an empty database and every query failed.

---

## 2. Defects found and fixed

### Critical

| # | Defect | Effect | Fix |
|---|--------|--------|-----|
| 1 | No migrations at all | Fresh deploy has no tables | Initial migration generated and verified; entrypoints now run `migration:run` before boot. (Superseded in section 7 by the better-auth schema migration.) |
| 2 | Refresh tokens signed with the **access** token lifetime | `JwtModule.signOptions.expiresIn` is `15m` and `generateRefreshToken` did not override it — refresh tokens died in 15 minutes while Redis held the key for 7 days. Sessions silently ended after 15 min | Sign with the same seconds value used for the Redis TTL so the two cannot drift (`auth.service.ts:80`) |
| 3 | `sib-api-v3-sdk` `require()`d but absent from `package.json` | `EmailProcessor` throws at module load on any clean install | Replaced with a `fetch` call to the Brevo v3 REST API — no SDK, no `any` |
| 4 | Committed superadmin password (`ChangeMe123!`) | Every clone shipped a live credential for a `SUPERADMIN` account | Seed now requires `ADMIN_PASSWORD`; refuses to run without it |
| 5 | Circular import `user.entity` ↔ `user_otp.entity` | Tolerated by `tsc`; crashes under SWC (`Cannot access 'Users' before initialization`) because `emitDecoratorMetadata` resolves the type eagerly | Broke the cycle with a type-only import plus a string relation target |

### High

| # | Defect | Effect | Fix |
|---|--------|--------|-----|
| 6 | `redisClient.keys('rt:<id>:*')` on every logout | `KEYS` blocks the Redis event loop across the entire keyspace | `scanStream` |
| 7 | `throw new Error('Refresh token is required')` | 500 instead of 401 on a missing refresh token | `UnauthorizedException` |
| 8 | R2 bucket names hardcoded to `poshpet-*` | Any deployment but one points at buckets it does not own | Resolved from `R2_BUCKET_*` config; throws a named error when unset |
| 9 | 21 env vars required to boot, including R2/Brevo/Sentry | `pnpm start:dev` impossible without third-party credentials | Integrations are `@IsOptional()`; core (app/db/redis/JWT) stays required |
| 10 | `JWT_SECRET` had no length constraint | A 4-character secret booted silently | `@MinLength(32)` |
| 11 | `email varchar(50)` | Rejects legitimate addresses; RFC 5321 allows 254 | `varchar(254)` + unique index. `firstName(20)`/`lastName(30)` → 100 |
| 12 | `deletedAt` was a plain `@Column` | `softRemove()` / `withDeleted()` do not honour it — soft delete was inert | `@DeleteDateColumn` |
| 13 | OTP `expiresAt`/`usedAt` were naive `timestamp` | Offset dropped; expiry comparisons wrong on any non-UTC server | `timestamp with time zone` |
| 14 | Cookie lifetimes hardcoded in 3 places (`15 * 60 * 1000`, `7 * 24 * ...`) | Changing `JWT_EXPIRATION` leaves cookies outliving their tokens | Single `setAuthCookies()` deriving both from config |
| 15 | `res.clearCookie()` called without options | Does not match cookies set with `path`/`sameSite`/`secure` — logout could leave them in place | Clear with the same attributes |
| 16 | 31 advisories (14 high) | — | 0 advisories (`pnpm audit --prod`) |

### Generalisation (no product name anywhere)

The repository is now product-neutral and rebrandable from a single variable.

- `APP_NAME` drives the Swagger title, description, and docs page title.
  `SWAGGER_TITLE` / `SWAGGER_DESCRIPTION` / `SWAGGER_ROUTE` override individually
  if needed.
- Migrations table: `poshpet_migrations` → `migrations`.
- R2 buckets: `poshpet-media` / `poshpet-capsules` / `poshpet-static` →
  logical `MEDIA` / `RESTRICTED` / `STATIC` resolved from `R2_BUCKET_*`.
- `UploadType` members renamed off the pet domain
  (`VET_ATTACHMENT` → `ATTACHMENT`, `CIRCLE_MEDIA`/`MEMORY_PAGE` → `DOCUMENT`).
- Swagger tags for `pets` and `tasks` removed; `AuditLog` and `BaseRepository`
  doc comments no longer reference pets, circles, or capsules.
- Docker container names, DB name, seed data, `.env.example`: all neutral.
- `.planning/` (3,700 lines of PoshPet product planning) moved to
  `.archive/poshpet-planning/` with a README explaining what is salvageable.

Verified: `grep -ri "poshpet\|pet"` over `src/`, `docker/`, and config returns
nothing outside `.archive/` and this audit.

### Auth transport — web and mobile

> **Superseded by section 7.** Defects 2, 6, 7, 14, 15 and this section describe
> the hand-rolled JWT module, which the better-auth migration then deleted. They
> are kept because the *classes* of bug are worth remembering, not because that
> code still exists. Dual web-cookie / mobile-bearer support survived the
> migration — see [AUTH.md](./AUTH.md) — but is now provided by better-auth's
> `bearer()` plugin rather than `AUTH_COOKIES_ENABLED`.

### Dead code removed

- `src/shared/types/uuid.d.ts` — declared module `request-to-curl` (copy-paste
  error; the filename says uuid).
- `src/shared/types/request-to-curl.d.ts` — declared the same non-existent,
  never-imported package. The curl builder is hand-rolled in
  `shared/utils/request-curl.utils.ts`.
- `nest-cli.json` asset glob for `external/email/templates/*.html` — no such
  directory; email uses Brevo template IDs.
- Swagger tags for `pets` and `tasks` — no such controllers.

---

## 3. Dependencies

### Removed (8)

| Package | Why |
|---------|-----|
| `bcrypt` | Duplicate of `bcryptjs`, which is what every call site actually imports. Native build for nothing |
| `@types/bcrypt` | Follows `bcrypt`. `bcryptjs@3` ships its own types |
| `axios` | Zero imports in `src/` or `test/` |
| `uuid@8.3.2` | Six majors behind and pulling a transitive advisory. `node:crypto.randomUUID()` is stdlib |
| `@types/uuid` | Follows `uuid` |
| `chalk@4` | Two majors behind, terminal colour only. `node:util.styleText` is stdlib |
| `brevo@1.0.0` | Declared but never imported. The processor `require()`d `sib-api-v3-sdk` instead — which was itself undeclared |
| `ts-loader`, `source-map-support` | Webpack builder is not used; nothing imports source-map-support |
| `ts-node`, `ts-jest` | Replaced by `tsx` (CLI) and `@swc/jest` (tests) |

### Added (5)

| Package | Why |
|---------|-----|
| `passport` | **Was missing.** `@nestjs/passport` declared it as a peer dependency and it was only present transitively — a stricter installer would have broken auth. (Later removed entirely in section 7.) |
| `@swc/core`, `@swc/cli`, `@swc/jest` | Compilation |
| `tsx` | TypeORM CLI and seeds, replacing `ts-node` |

Everything else was bumped to current minor. Held back deliberately: `eslint 10`,
`typescript 7`, `typeorm 1.x`, `bullmq 6`, `ioredis 6` — all majors, and this pass
was not a framework migration. See [BACKLOG.md](./BACKLOG.md).

---

## 4. Toolchain

**npm → pnpm.** `packageManager` is pinned; `pnpm-workspace.yaml` holds the
build-script allowlist (pnpm 10 no longer reads it from `package.json`) and the
`js-yaml` security override. Docker, CI, husky, and both docs updated.

**tsc → SWC** for both build and tests.

| | Before | After |
|---|--------|-------|
| `build` | tsc | **57–105 ms** (SWC) + tsc type-check |
| `test` | ts-jest | **~1.0 s** for 7 suites |

`nest-cli.json` sets `typeCheck: true`, so `pnpm build` still fails on a type
error — SWC alone does not type-check.

**Bun was considered and rejected.** It runs TypeScript natively, which is the
faster answer to "native TS compilation", but NestJS + TypeORM lean hard on
`emitDecoratorMetadata` and `reflect-metadata`, and that path is still rough on
Bun in production. Node's own type-stripping cannot emit decorator metadata at
all, so it is not an option here. SWC gets the compile speed without changing the
runtime. Revisit if the runtime is ever a bottleneck.

---

## 5. Verified

Against Postgres 16 and Redis 7 in Docker:

- `InitialSchema` applies cleanly; a second `migration:generate` reports **no
  schema drift**.
- `pnpm db:seed` creates the admin user.
- App boots with only `DB_*`, `REDIS_*`, and `JWT_SECRET` set.
- `POST /api/v1/auth/signin` → tokens + user.
- `GET /api/v1/auth/me` via httpOnly cookie → profile.
- Refresh token `exp - iat` = **604800 s (7 days)**. Before the fix: 900 s.
- `POST /api/v1/auth/refresh` with no token → **401** (was 500).
- Cookies disabled → no `Set-Cookie`, tokens still in the body (covered by test).
- `pnpm build` — 0 type errors. `pnpm test` — 10/10. `pnpm audit --prod` — clean.
- `pnpm lint` — clean across `src/modules`, `src/shared/config`,
  `src/shared/utils`, `src/external`. 87 errors remain in `src/common`,
  `src/shared/middleware`, `src/shared/providers`, `src/app`, and `main.ts` —
  pre-existing `no-unsafe-*` debt from `noImplicitAny: false`, untouched by this
  pass and never enforced in CI. Logged in the backlog.

---

## 6. Known-open

Carried forward, not fixed in this pass — see [BACKLOG.md](./BACKLOG.md) for all
of them:

- `AllExceptionsFilter.sendAdminAlert()` is still a stub. `EmailService` is
  `@Global()` but was never injected, so SEC-08 / EMAIL-06 admin alerting does
  not fire.
- `ThrottlerModule` uses the in-memory store — rate limits are per-instance and
  do not survive horizontal scaling.
- The `UserOtp` entity is unused, and its `otp` column would store the code in
  plaintext. Hash it before any verification flow ships.
- `StorageService.buildPath()` still encodes pet-domain paths
  (`photos/{userId}/{ownerId}/...`); the enum members were genericised but the
  shape is a leftover.
- `tsconfig.json` runs with `noImplicitAny: false` and `strictBindCallApply:
  false`.
- `AuditLog` does not extend `BaseEntity` and redefines its own id/timestamps.
- `IUserRepository` is an interface with exactly one implementation.


---

## 7. better-auth migration (second pass)

### What replaced what

The hand-rolled Passport/JWT module was deleted and replaced with **better-auth
1.6.26** plus its organization plugin. Removed outright:

`modules/auth/{application,infrastructure,presentation}`, the whole
`modules/user` tree (entities, repository, service, controller, DTOs), and
`seeds/user.seed.ts` + `seeds/datasource.ts`.

Deps removed: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`,
`@types/passport-jwt`, `bcryptjs`, `kysely`, `@thallesp/nestjs-better-auth`.
Added: `better-auth`, `express`, `nestjs-throttler-storage-redis`, `@types/pg`.

### What this bought

Signup, email verification, sign-in, sign-out, password reset, database-backed
sessions, organizations, members, per-org roles, and the full invitation
lifecycle — none of it code we now maintain. See [AUTH.md](./AUTH.md).

### Two things worth knowing before touching this

**better-auth is ESM-only** (`"type": "module"`, no `require` condition) and this
project compiles to CommonJS. It is loaded via dynamic `import()` with
`module.ignoreDynamic: true` in `.swcrc`; SWC would otherwise rewrite those calls
to `require()` and the process would die at boot with `ERR_REQUIRE_ESM`. This is
also why `@thallesp/nestjs-better-auth` was dropped — it is ESM-only *and* drags
in `@nestjs/graphql`, `@nestjs/websockets`, and `qs` peers this project does not
have. Wiring better-auth directly is ~80 lines and has no peer surface.

**better-auth has no TypeORM adapter.** It reaches Postgres through Kysely with
its own `pg` Pool. To avoid two independent schema owners, its CLI is not used:
`pnpm auth:sql` prints the DDL for the current plugin set, and that output is
pasted into a TypeORM migration. `pnpm db:migration:run` remains the only way the
schema changes.

### Design decisions

- **Auth is default-on.** `AuthGuard` is a global `APP_GUARD`; every route needs
  a session unless it carries `@Public()`. Health and root are `@Public()`.
- **Two role axes, not one.** `user.role` (`AppRole`) is platform-wide;
  `member.role` (`owner`/`admin`/`member`) is per-organization. Collapsing them
  would make "owner of org A" imply rights in org B.
- **`role` is `input: false`.** Verified: a signup body containing
  `"role":"admin"` still produces `role: "user"`.
- **User ids are text, not UUID.** better-auth generates its own string ids, so
  `audit_logs.actor_id` is `text`; a `uuid` column would reject every real id.

### Carried-over critical fixes, done in this pass

| Item | Before | After |
|---|---|---|
| Admin alerting | `sendAdminAlert()` logged "would be sent" | Enqueues a real `ADMIN_ALERT` email via BullMQ |
| Rate limiting | In-memory store — limit multiplied by replica count | Redis-backed via `nestjs-throttler-storage-redis` |
| Email templates | Hardcoded IDs `1`–`5` with `TODO` | `BREVO_TEMPLATE_*` env vars; fails loudly, naming the missing variable |
| OTP storage | `UserOtp.otp` plaintext `varchar(10)` | Entity deleted; better-auth owns verification tokens |
| Docker port | Postgres pinned to host `5432`, collided with local Postgres | `${DB_PORT:-5433}` on the host, 5432 inside |
| Lint | 87 errors | 70 errors, despite a new module (`src/modules`, `src/common/{guards,decorators,filters}`, `src/shared/{config,utils}`, `src/external` now clean) |

### Verified end to end

Against Postgres 16 + Redis 7, from an empty database:

- Migration applies; 9 tables created (`user`, `session`, `account`,
  `verification`, `organization`, `member`, `invitation`, `audit_logs`,
  `migrations`).
- `pnpm db:seed` creates the admin, promotes it to `role=admin`, and is
  idempotent on a second run.
- Signup → verification email enqueued with a real link → following the link sets
  `emailVerified=true` → sign-in then succeeds.
- Unverified sign-in is refused with `EMAIL_NOT_VERIFIED`.
- `"role":"admin"` in a signup body is ignored; the user is created as `user`.
- Organization created (creator becomes `owner`), active org set, member invited,
  invitation accepted by a second user, `list-members` shows `owner` + `member`,
  `get-active-member` returns `owner`.
- Invitation row transitions `pending` → `accepted`; 2 member rows.
- `/api/v1/*` returns 401 without a session and 200 with a bearer token.
- Missing `BREVO_TEMPLATE_VERIFICATION` fails the queued job with that exact
  message rather than sending against a guessed template.
- `pnpm build` 0 type errors · `pnpm test` 14/14 · `pnpm audit --prod` clean.

### Not done

- **Tenancy scoping is not enforced.** `OrgRolesGuard` checks permission, not
  ownership. There are no org-owned application tables yet; the first one must
  filter by `session.activeOrganizationId` and return 404 for other tenants.
- Social login, 2FA, teams, and auth-specific rate limits are all available in
  better-auth and unconfigured.

---

## 8. Completeness pass (third pass)

Closed the blocking and important gaps listed at the end of section 7.

### Tenancy, proven

`src/modules/project/` is a reference org-owned resource. `@ActiveOrganization()`
extracts the tenant from the session and throws 400 when absent — returning
undefined would silently widen every query to all tenants. Every service method
takes `organizationId` first and filters on it, and a foreign row raises **404,
not 403**, so an id cannot be probed for existence. Full rules in
[TENANCY.md](./TENANCY.md).

Verified against Postgres with two organizations: owner B reading, updating, and
deleting owner A's project all returned 404, and B's list was empty. Seven unit
tests assert the same, including that update/delete never reach the repository.

Two adjacent defects surfaced while building it:

- `typeorm.datasource.ts` had a hand-maintained entity list that had already
  drifted, so `migration:generate` produced an **empty diff** for a table that did
  not exist. Replaced with a glob, mirroring `autoLoadEntities`.
- `PaginationResult` spread `page`/`limit`/`total` at the top level, but
  `ResponseInterceptor` only unwraps `{ items, meta }`. Paginated endpoints were
  returning the raw object as `data` and **never emitting pagination metadata**.
  Both now use `PaginationMeta.from()`.

### Logging

pino via `nestjs-pino` replaces `logging.middleware.ts` (325 lines) and
`logging.interceptor.ts`, plus the `request-curl.utils.ts` they depended on —
about 450 lines deleted for ~100. The old pair logged full request bodies and a
reconstructed curl command on every request, and made two passes over each one.

JSON on stdout in production, pretty in development. `X-Request-ID` is honoured
if sent, generated otherwise, echoed on the response, and attached to every line.
Credentials are dropped, not masked. Health probes are excluded so they do not
dominate volume.

### Auth hardening

| | Before | After |
|---|---|---|
| Sign-in | global 100 req/min | 5/min |
| Signup | global 100 req/min | 10/hour |
| Password reset | global 100 req/min | 5/hour |
| Storage | in-process | Redis, shared across replicas |

Verified: the 6th sign-in attempt inside a minute returns 429.

`nestjs-throttler-storage-redis` was published as **deprecated — no longer
supported** during this pass; swapped for `@nest-lab/throttler-storage-redis`,
which is maintained and declares NestJS 11 support.

### Audit trail

`AuditLogService` had no callers. Now: `USER_CREATED`, `SESSION_CREATED` and
`USER_DELETED` come from better-auth `databaseHooks` — the only place that sees
them, since better-auth bypasses Nest's pipeline — and resource mutations are
recorded by the service layer with `organizationId`. Confirmed writing to
`audit_logs` in a live run.

### GDPR

- **Access / portability** — `GET /api/v1/account/export` returns the account,
  memberships, sessions, linked providers, and audit trail as a JSON attachment.
  Password hashes and OAuth tokens are deliberately excluded; exporting a
  credential is not portability.
- **Erasure** — better-auth's `delete-user`, enabled and confirmed by email so a
  stolen session cannot destroy an account. Cascades clear sessions, accounts,
  and memberships.

### Lint

**87 → 0**, and `pnpm lint:check` (non-mutating, `--max-warnings 0`) now runs in
CI before tests. Most of the debt left with the deleted logging files; the rest
was typing `catch (error: unknown)`, replacing `as any`, and removing dead
imports.

### Verified

- `pnpm build` — 0 type errors · `pnpm test` — 24/24 · `pnpm test:e2e` — 4/4
- `pnpm lint:check` — clean · `pnpm audit --prod` — clean
- Migration chain applies from empty and reports no drift; `projects` created
- Live: tenancy isolation, rate limits, paginated envelope with `meta`, GDPR
  export headers, audit rows

### Not done

- Social login and 2FA — available in better-auth, need OAuth credentials
- Postgres row-level security — the tenant filter is application-level, so a
  hand-written raw query can still bypass it
- Log sink — pino writes JSON to stdout; nothing ships it anywhere yet
- Prometheus metrics; coverage thresholds

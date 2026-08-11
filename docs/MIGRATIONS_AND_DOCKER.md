# Migrations and Docker

## Two schema owners, one migration chain

The database has two owners:

- **better-auth** owns `user`, `session`, `account`, `verification`,
  `organization`, `member`, `invitation`. It reaches Postgres through Kysely
  with its own `pg` pool, not TypeORM.
- **TypeORM** owns application tables (`audit_logs`, `projects`).

better-auth ships its own migration CLI. **It is deliberately not used.** Two
independent tools writing the same schema means two sources of truth and no
single ordering. Instead, `pnpm auth:sql` prints the DDL better-auth needs for
its current plugin set, and that output is pasted into a TypeORM migration.

`pnpm db:migration:run` stays the only way the schema ever changes.

**Key files**
- `src/shared/config/typeorm.datasource.ts` — CLI datasource. Entities are a
  glob, not a hand-maintained list; a list drifts, and a missing entity makes
  `migration:generate` emit an empty diff for a table you just added.
- `src/shared/config/database.config.ts` — connection settings shared by all
  four places that open a Postgres connection.
- `src/migrations/` — the migration files.
- `scripts/print-auth-sql.ts` — behind `pnpm auth:sql`.

---

## Commands

| Command | What it does |
|---|---|
| `pnpm db:migration:create <Name>` | Empty migration file |
| `pnpm db:migration:generate <Name>` | Diff entities against the live DB |
| `pnpm db:migration:run` | Apply pending migrations |
| `pnpm db:migration:revert` | Revert the last one |
| `pnpm auth:sql` | Print better-auth's required DDL |
| `pnpm db:seed` | Seed the admin user (needs `ADMIN_EMAIL` + `ADMIN_PASSWORD`) |

No build step is needed — the CLI runs under `tsx` against the TypeScript
datasource.

---

## Changing application entities

```bash
# 1. Edit or add an entity, e.g. src/modules/project/project.entity.ts
# 2. Generate the diff (needs a running database)
pnpm db:migration:generate AddProjectArchivedAt
# 3. Read the generated SQL. Always. Then:
pnpm db:migration:run
```

Generated migrations are a starting point, not an answer. TypeORM will happily
emit a `DROP COLUMN` for something it merely failed to see.

## Changing better-auth configuration

Adding a plugin or an `additionalFields` entry changes better-auth's schema.
TypeORM cannot see those tables, so `migration:generate` will **not** produce
them.

```bash
# 1. Edit src/modules/auth/auth.config.ts
# 2. Print the full desired schema
pnpm auth:sql
# 3. Diff it against the current migrations, create one for the delta
pnpm db:migration:create AddTwoFactorTables
# 4. Paste the delta in, then:
pnpm db:migration:run
```

Skipping step 2 is the most common way to ship a broken deploy: the app boots,
and the first sign-in fails on a missing table.

---

## Migrations must be backward-compatible

Production runs `replicas: 2` with rolling updates, so **the old and new
versions serve traffic at the same time** during every deploy. A migration that
breaks the running version takes the site down mid-rollout.

Expand/contract, always:

1. **Expand** — add the column/table, nullable or defaulted. Deploy.
2. **Migrate** — backfill; write to both shapes. Deploy.
3. **Contract** — once nothing reads the old shape, drop it. Deploy.

Renaming a column is three releases. Dropping one in the same release that stops
using it will 500 every request served by the old replica during the rollout.

Also note: `src/migrations/1786360000000-InitialSchema.ts` names the
`audit_logs` indexes with TypeORM's generated hashes rather than friendly names.
That is deliberate — they must match what `@Index()` produces, or
`migration:generate` reports a rename on every single run forever.

---

## Where migrations run

| Environment | When |
|---|---|
| Development | On container start, in `docker/entrypoint.dev.sh`. One replica, no race. |
| Production | Once, before rollout, by `scripts/deploy.sh`. |

Production deliberately does **not** migrate in the entrypoint. With two
replicas both tasks would race `migration:run`, and TypeORM takes no advisory
lock — the result is a half-applied schema and a poisoned `migrations` table.

---

## Docker

### Development — `docker/docker-compose.dev.yaml`

App, Postgres 16, Redis 7. Hot reload via bind-mounted `src/` plus SWC watch.

```bash
pnpm docker:up:dev       # start
pnpm docker:watch:dev    # start with compose watch
pnpm docker:logs:dev     # follow logs
pnpm docker:down:dev     # stop
pnpm docker:clean:dev    # stop and DESTROY volumes
```

| Service | Host port |
|---|---|
| app | 5500 |
| postgres | `127.0.0.1:${DB_PORT:-5433}` |
| redis | `127.0.0.1:${REDIS_PORT:-6379}` |

Postgres defaults to **5433** on the host because a locally installed Postgres
on 5432 shadows the container and fails with a confusing "role does not exist".
Inside compose the app always talks to 5432.

Redis runs with `--appendonly yes` and `--maxmemory-policy noeviction`, matching
production. `noeviction` is required by BullMQ — under an LRU policy Redis can
evict a job hash while its id stays queued, corrupting the queue in a way that
surfaces hours later. Dev matches prod so the bug cannot hide locally.

### Production — `docker/stack.yaml`

A single-node Docker **Swarm** stack, not Compose. Postgres is not in it —
production uses a managed instance. See **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

```bash
pnpm deploy          # migrate, then rolling update
pnpm stack:status
pnpm stack:rollback
```

### Production image — `docker/Dockerfile`

Four stages on `node:22-alpine`:

| Stage | Purpose |
|---|---|
| `base` | corepack + pnpm, lockfiles copied |
| `build` | full dependency tree, `pnpm build` (SWC) |
| `prod-deps` | production dependencies only |
| `run` | dist + prod deps, non-root `nestjs:1001`, `dumb-init` as PID 1 |

Carries a `HEALTHCHECK` against `http://127.0.0.1:5500/health` — `127.0.0.1`
rather than `localhost` because on Alpine `localhost` can resolve to `::1` while
the app binds IPv4, producing a permanently unhealthy healthy app.

`docker/entrypoint.sh` exports `FOO` from `FOO_FILE` for Swarm secrets, then
`exec node dist/main`. It does not migrate or seed.

---

## Environment

`.env.example` is the complete list. Eleven variables are required to boot and
the app refuses to start without them:

`NODE_ENV`, `PORT`, `CLIENT_URL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`,
`DB_NAME`, `REDIS_HOST`, `REDIS_PORT`, `JWT_SECRET` (min 32 chars).

Everything else is optional, and the service that needs it fails at the point of
use rather than at boot.

Worth calling out:

- **`DB_SSL`** — `false` for a local container, `true` for managed Postgres.
  Certificate verification stays on; use `DB_SSL_CA` for a private root.
- **`TRUST_PROXY_HOPS`** — `0` when exposed directly, `1` behind Caddy. Wrong
  either way breaks rate limiting. See DEPLOYMENT.md.
- **`BETTER_AUTH_URL`** — the public origin. Email links are built from it.
- **`ADMIN_PASSWORD`** — unset it after the first seed.

---

## Troubleshooting

**Migrations "do nothing" after adding an entity** — the datasource globs
`src/modules/**/*.entity.ts`. A file outside that path is invisible, and
`migration:generate` reports no changes rather than erroring.

**`migration:generate` keeps emitting the same index rename** — the migration's
index name does not match what `@Index()` generates. Use TypeORM's name.

**Auth tables missing after adding a plugin** — you skipped `pnpm auth:sql`.

**Container is `unhealthy` but the app responds** — check the probe path. Health
is at `/health`, deliberately outside the `/api` prefix and unversioned.

**`docker compose config` fails with "required variable ... is missing"** —
`env_file:` does not feed `${VAR}` interpolation; only `--env-file` does.
`scripts/deploy.sh` passes it. Running compose by hand, you must too.

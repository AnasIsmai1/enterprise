# Deployment — single-node Docker Swarm

Production runs as a Swarm stack on one VPS. Swarm rather than plain Compose
because it gives real rolling updates: `start-first` brings a new task up, waits
for its healthcheck, and only then retires the old one. Plain Compose stops the
old container first, which is a visible outage on every deploy.

One node is fine. Nodes can be added later without changing `docker/stack.yaml`.

**Postgres is not in the stack.** Production uses a managed instance, so backups,
failover and PITR belong to the provider. Local Postgres lives in
`docker-compose.dev.yaml` and is unaffected.

---

## What runs

| Service | Replicas | Published |
|---|---|---|
| `caddy` | 1 | **80, 443, 443/udp — the only host ports** |
| `app` | 2 | none |
| `redis` | 1 | none |
| `watchtower` | 1 | none |
| `socket-proxy` | 1 | none |
| `uptime-kuma` | 1 | none |

Three networks: `edge` (caddy, app, kuma, watchtower); `backend` (app, redis);
and `socket` (watchtower, socket-proxy). `backend` and `socket` are both
`internal: true`, so neither Redis nor the socket proxy has any route to the
internet. Nothing but Caddy is reachable from outside the host.

---

## First-time setup

### 1. Managed Postgres
Create the database and copy the connection details into `.env`. Set
`DB_SSL=true` — every managed provider requires TLS.

Certificate verification stays on. If your provider does not chain to a public
root, put its CA in `DB_SSL_CA` (inline PEM or a path). Do **not** reach for
`DB_SSL_REJECT_UNAUTHORIZED=false`; it accepts any certificate, which means the
connection is encrypted to whoever answered rather than to your database.

**Confirm point-in-time recovery is enabled with your provider.** This stack has
no backup of its own by design.

### 2. DNS
`API_DOMAIN` and `STATUS_DOMAIN` must both resolve to the VPS **before** the
first deploy. Caddy requests certificates on startup; if DNS is not ready, ACME
fails and backs off exponentially with otherwise-valid config.

### 3. Swarm and secrets
```bash
docker swarm init

printf '%s' 'your-db-password'       | docker secret create enterprise_db_password -
openssl rand -base64 48 | tr -d '\n' | docker secret create enterprise_better_auth_secret -
printf '%s' 'xkeysib-...'            | docker secret create enterprise_brevo_api_key -
```

Swarm distributes these encrypted at rest and mounts them at `/run/secrets/*`.
`docker/entrypoint.sh` exports `FOO` from `FOO_FILE`, so the app keeps reading
`process.env` and needs no `_FILE` awareness.

### 4. Registry access
```bash
docker login ghcr.io   # PAT with read:packages
```
Required twice over: the `app` service pulls a private image, and Watchtower
401s silently without credentials — reporting nothing for the one image you care
about.

### 5. `.env`
```bash
cp .env.example .env && chmod 600 .env
```
Fill in `APP_IMAGE`, `ACME_EMAIL`, `API_DOMAIN`, `STATUS_DOMAIN`,
`WATCHTOWER_NOTIFICATION_URL`, the `DB_*` values, and set `TRUST_PROXY_HOPS=1`.

`APP_IMAGE` has no `latest` tag — CI publishes `main`, `dev`, `v*` and SHA tags
only. Pin an immutable tag for real deploys. The repo name is lowercased by the
registry: `ghcr.io/eagleanalytix/enterprise`.

### 6. Deploy
```bash
pnpm deploy
```

---

## Verified

The Swarm path was exercised end to end on a single node before this shipped:

- Rolling update `v1 → v4` with a request loop against the ingress port:
  **2,998 successful requests, 0 failures.** Task history confirms `start-first`
  — new tasks reach `Running` before old ones move to `Shutdown`.
- Swarm secrets mount at `/run/secrets/*`, and the entrypoint's `_FILE` shim
  puts them in the Node process environment: with a deliberately wrong
  `DB_PASS` in `.env`, the process still received the secret's value and the
  database health indicator reported `up`.
- `docker service update` waits for the healthcheck before converging, which is
  only true because `/health` actually answers.

Two incompatibilities were found and fixed in `scripts/deploy.sh` during that
run; both made the *first* deploy fail:

1. `docker compose config` emits ports as quoted strings and `stack deploy`
   demands integers.
2. It injects a top-level `name:` that the stack schema rejects.

A third was found in `docker/Dockerfile`: `pnpm install --prod` aborted because
the `prepare` script runs husky, a devDependency. Every production image build
would have failed. `--ignore-scripts` fixes it.

---

## Deploying

```bash
pnpm deploy              # migrate, then roll out
pnpm deploy:no-migrate   # roll out only
pnpm stack:status        # docker stack services enterprise
pnpm stack:logs          # follow app logs
pnpm stack:rollback      # revert app to the previous image
```

`scripts/deploy.sh` runs migrations **once, before** any new task starts, then
`docker stack deploy`. That ordering is the whole point — see below.

A failing rollout reverts itself: `failure_action: rollback` with a 60s monitor
window. If the new tasks never pass their healthcheck, the old ones stay.

---

## Migrations, and why they are not in the entrypoint

They used to run on every container start. With `replicas: 2` both tasks would
race `migration:run`, and **TypeORM takes no advisory lock** — you get a
half-applied schema and a poisoned `migrations` table.

So migrations are a deliberate pre-deploy step, run once by `deploy.sh` using
the same image about to ship.

**The consequence is permanent: migrations must be backward-compatible.** During
a rolling update the old and new versions serve traffic simultaneously, so no
migration may break the running version.

Expand/contract:

1. **Expand** — add the new column/table, nullable or defaulted. Deploy.
2. **Migrate** — backfill, and write to both old and new. Deploy.
3. **Contract** — once nothing reads the old shape, drop it. Deploy.

A rename is three releases, not one. Dropping a column in the same release that
stops using it will 500 every request served by the old replica during rollout.

`docker-compose.dev.yaml` still migrates on startup — one replica, no race.

---

## What Watchtower does and does not do

It checks daily whether a newer image exists and **notifies**. That is all.

It does not restart, update, or deploy anything. `WATCHTOWER_MONITOR_ONLY` and
`WATCHTOWER_NO_RESTART` are both set, deliberately redundantly, so a single typo
cannot quietly re-enable unattended updates. Deploying is `pnpm deploy`, by a
human, after migrations.

It still *pulls* images to compare digests — that is required, and harmless.

**On the docker socket:** Watchtower does not have it. `tecnativa/docker-socket-proxy`
holds it and exposes read-only container and image endpoints
(`CONTAINERS=1 IMAGES=1 POST=0`); Watchtower reaches the API over an
`internal: true` network via `DOCKER_HOST`. This matters because `:ro` on a
socket bind restricts the *file*, not the API — anything that can reach the
socket directly can start a privileged container and own the host. With the
proxy, a Watchtower compromise is no longer a host compromise.

---

## Monitoring

Uptime Kuma at `STATUS_DOMAIN` probes `/health` and tracks certificate expiry.
Sentry already captures 5xx from inside the app.

**Add one free external check** (UptimeRobot or similar) against
`https://API_DOMAIN/health`. Kuma runs on the box it watches, so it is
structurally incapable of telling you the box is down — which is the failure you
most want to be paged for.

Health endpoints:

| Path | Checks | Use for |
|---|---|---|
| `/health` | database, redis, heap, disk | readiness, Kuma, external monitors |
| `/health/live` | nothing — process is up | liveness probes |

Both are unversioned and outside the `/api` prefix on purpose: probes should not
have to track an API version. Tune with `HEALTH_HEAP_LIMIT_MB` (default 512) and
`HEALTH_DISK_THRESHOLD` (default 0.9).

---

## Things that will bite

**`TRUST_PROXY_HOPS` must be exactly 1 behind Caddy.** At 0 the throttler sees
Caddy's IP for every request and buckets the entire internet into one shared
100 req/min limit. Set too high, a client can forge `X-Forwarded-For` and evade
rate limiting entirely.

**`BETTER_AUTH_URL` must be the public HTTPS origin.** better-auth builds
verification, password-reset and invitation links from it, and derives
secure-cookie behaviour from it. Left at `http://localhost:5500`, users get
localhost links and non-secure cookies.

**Unset `ADMIN_PASSWORD` after the first deploy.** It only seeds an admin once;
leaving it in `.env` keeps a live credential on disk for a one-time operation.

**Do not `docker compose up docker/stack.yaml`.** `deploy:` keys are inert under
Compose — you would silently get one replica, no rolling update, and no resource
limits. Use `pnpm deploy`.

**Do not scale `app` by editing replicas alone** if you ever move migrations back
into the entrypoint. The race is real.

**Redis holds sessions, rate-limit counters and the BullMQ queue.** It is
persisted (AOF, `redis_data`) and set to `noeviction`, which BullMQ requires —
an LRU policy can evict a job hash while its id stays queued and corrupt the
queue silently. Do not "optimise" that to `allkeys-lru`.

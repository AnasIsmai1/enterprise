# Auth, organizations, and invitations

Identity is owned by **better-auth**. It serves every auth and organization route
itself under `/api/auth/*`, mounted as raw Express middleware in `main.ts` so it
bypasses Nest's pipeline entirely. Application routes live under `/api/v1/*`.

Two consequences worth knowing before you debug anything:

1. **Two response shapes.** `/api/auth/*` returns better-auth's own JSON.
   `/api/v1/*` returns the app envelope (`{ success, data }`). This is expected;
   they are different servers sharing a port.
2. **Body parsing is off globally** (`bodyParser: false` in `main.ts`) and
   re-enabled *after* the auth handler is mounted. better-auth reads the raw
   request stream — if Express consumes it first, every `POST /api/auth/*` hangs.
   Do not move `express.json()` above that mount.

---

## Web and mobile, simultaneously

| | Web (browser) | Mobile / native |
|---|---|---|
| Receives session via | `Set-Cookie` (httpOnly) | `token` in the response body |
| Sends session via | cookie, automatically | `Authorization: Bearer <token>` |
| Enabled by | default | the `bearer()` plugin |

`AuthGuard` passes the whole header set to `auth.api.getSession()`, so whichever
of the two is present wins. A mobile client that never touches a cookie is a
first-class citizen — no separate endpoint, no flag to set.

```bash
# Sign in
TOKEN=$(curl -s -X POST $API/sign-in/email \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"correct-horse-battery"}' \
  | jq -r .token)

# Use it anywhere
curl $API/organization/list -H "authorization: Bearer $TOKEN"
curl http://localhost:5500/api/v1/projects -H "authorization: Bearer $TOKEN"
```

---

## Endpoints

Identity (`/api/auth`):

| Route | Purpose |
|---|---|
| `POST /sign-up/email` | Register. Sends a verification email |
| `POST /sign-in/email` | Sign in. 403 `EMAIL_NOT_VERIFIED` until verified |
| `GET /get-session` | Current session and user |
| `POST /sign-out` | Revoke the session |
| `GET /verify-email?token=` | Verification link target |
| `POST /forget-password` | Send a reset link |
| `POST /reset-password` | Consume the reset token |

Organizations (`/api/auth/organization`):

| Route | Purpose |
|---|---|
| `POST /create` | Create an organization; creator becomes `owner` |
| `GET /list` | Organizations the caller belongs to |
| `POST /set-active` | Set the session's active organization |
| `GET /get-full-organization` | Active organization with members |
| `POST /invite-member` | Invite by email; sends the invitation email |
| `POST /accept-invitation` | Accept (invitee must be signed in) |
| `POST /reject-invitation`, `/cancel-invitation` | Decline / withdraw |
| `GET /list-invitations` | Pending invitations for the active org |
| `GET /list-members`, `POST /update-member-role`, `POST /remove-member` | Membership |
| `POST /update`, `POST /delete`, `POST /leave` | Organization lifecycle |

Teams and dynamic roles exist in the plugin but are disabled here — enable them
in `auth.config.ts` if needed.

---

## Guards

```ts
@Public()                        // no session required (health checks, webhooks)
@Roles(AppRole.ADMIN)            // application-level role, from user.role
@OrgRoles('owner', 'admin')      // role within the caller's ACTIVE organization
```

`AuthGuard` is registered globally, so **every route requires a session unless it
carries `@Public()`** — the safe default direction. Guard order is
`Throttler → Auth → Roles`; `OrgRolesGuard` is opt-in per route and must run
after `AuthGuard`.

### Two role axes, deliberately separate

- `user.role` (`AppRole`: `user` | `admin`) — platform-wide. Declared with
  `input: false` in `auth.config.ts`, so a signup request **cannot** set its own
  role. Promotion happens by direct UPDATE (see `src/seeds/index.ts`).
- `member.role` (`owner` | `admin` | `member`) — scoped to one organization. A
  user can be `owner` of one org and `member` of another.

Do not collapse these into one enum.

---

## Tenancy

`OrgRolesGuard` answers "may this caller do this *kind* of thing here". It does
**not** scope data. Every org-owned query must filter by the active organization
id in the service layer, and return **404, not 403**, for another tenant's
resource — a 403 confirms the row exists.

The active organization is on the session (`session.activeOrganizationId`) and is
reset on each sign-in; clients call `POST /organization/set-active` after signing
in.

---

## Schema

better-auth owns `user`, `session`, `account`, `verification`, `organization`,
`member`, `invitation`. TypeORM owns application tables (`audit_logs`).

Both live in **one migration chain**. better-auth's CLI is deliberately not used;
instead `pnpm auth:sql` prints the DDL for the current plugin set and that output
is pasted into a TypeORM migration. So:

```bash
# after changing plugins or additionalFields in auth.config.ts
pnpm auth:sql                       # prints the full desired schema
pnpm db:migration:create AddSomething
# paste the delta into the new migration, then:
pnpm db:migration:run
```

`pnpm db:migration:run` stays the only way the schema ever changes.

Note: user ids are better-auth's own text ids, not UUIDs. Application tables that
reference a user must use `text`, not `uuid` — `audit_logs.actor_id` does.

---

## ESM

better-auth is ESM-only (`"type": "module"`, no `require` condition); this project
compiles to CommonJS. It is therefore loaded with dynamic `import()` in
`auth.config.ts` and `main.ts`, and `.swcrc` sets `module.ignoreDynamic: true` so
SWC leaves those calls alone. **Converting them to static imports breaks the boot
with `ERR_REQUIRE_ESM`.**

The provider is an async factory for the same reason, which is why
`app.get(BETTER_AUTH)` is only safe after the module has initialised.

Related: `pnpm db:seed` runs under `tsx` (esbuild), which cannot emit decorator
metadata, so it constructs what it needs directly instead of booting a Nest
context. Do not "simplify" it back to `NestFactory.createApplicationContext`.

---

## Rate limiting

Two layers. The global `@nestjs/throttler` (100 req/min) covers `/api/v1/*`;
better-auth applies its own, tighter limits to credential endpoints
(`auth.config.ts`):

| Endpoint | Limit |
|---|---|
| `/sign-in/email` | 5 / minute |
| `/sign-up/email` | 10 / hour |
| `/forget-password`, `/reset-password` | 5 / hour |
| `/send-verification-email` | 5 / hour |
| `/organization/invite-member` | 50 / hour |

Counters live in Redis (`secondaryStorage`), so limits hold across replicas.

**Behind a proxy this depends on `TRUST_PROXY_HOPS`.** At `0` behind Caddy every
request appears to come from the proxy and the whole internet shares one bucket.

## Known gaps

- No social login. The plugins exist (`socialProviders` in `auth.config.ts`);
  nothing is configured.
- No 2FA. `better-auth/plugins/two-factor` is available and unused.
- Social login and 2FA are unconfigured (plugins exist, no credentials wired).
- `BREVO_TEMPLATE_*` must be set or verification, reset, and invitation emails
  fail in the queue. They fail loudly with the missing variable named. Generate
  them from `templates/brevo/*.html`:

  ```bash
  BREVO_API_KEY=xkeysib-... pnpm brevo:sync   # --dry-run to preview
  ```

  The script matches templates by name, so re-running updates in place.
- Account deletion is `POST /api/auth/delete-user` (not DELETE), confirmed by
  email before anything is removed.

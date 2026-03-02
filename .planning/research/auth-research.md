# Auth Domain Research: Better-Auth vs Clerk vs Extend Existing Boilerplate

**Project:** PoshPet Backend API
**Domain:** Authentication & Authorization
**Researched:** 2026-03-02
**Mode:** Comparison
**Overall Confidence:** MEDIUM (no web access available; based on training data through mid-2025 + codebase analysis)

> **IMPORTANT:** WebSearch, WebFetch, and Context7 were all unavailable during this research session. All external claims are based on training data (cutoff ~May 2025). Verify version numbers, pricing, and API surface against current official documentation before making final decisions.

---

## Executive Summary

PoshPet already has a **production-quality auth foundation** in its NestJS boilerplate. The existing code includes JWT access tokens (15-min) with Redis-backed refresh tokens (7-day), token rotation with JTI-based revocation, httpOnly cookie transport, Passport.js JWT strategy, and a full CASL-based RBAC system with roles and permissions seeded from the database. This is not a skeleton -- it is a working, well-structured auth system that matches 80% of PoshPet's requirements.

**The recommendation is clear: extend the existing boilerplate.** Neither Better-Auth nor Clerk provides enough value to justify the integration cost, and both introduce significant downsides for this specific project.

Better-Auth is a promising self-hosted library, but it is young (v1.x, released late 2024), has no official NestJS adapter, does not natively support TypeORM (it targets Prisma/Drizzle), and would require ripping out the existing auth system to replace it with something that provides roughly the same functionality plus social login -- which can be added to the existing system in 1-2 days.

Clerk is a polished managed service, but it is designed for frontend-first architectures (Next.js, React). Its NestJS backend integration is manual (verify JWTs yourself), it creates a user data split (identity in Clerk, domain data in your database), it adds webhook complexity for user sync, it costs money at scale, and it conflicts with PoshPet's "Privacy as Promise" principle by sending user data to a third party.

---

## Existing Boilerplate Analysis

Before comparing options, here is exactly what the boilerplate already provides:

### What Already Works

| Capability | Status | Implementation |
|---|---|---|
| Email/password sign-in | DONE | `AuthService.signin()` with bcrypt comparison |
| JWT access tokens (15-min) | DONE | `@nestjs/jwt` with configurable expiration |
| JWT refresh tokens (7-day) | DONE | Redis-stored with JTI, configurable TTL |
| Token rotation | DONE | `rotateTokens()` with old token revocation |
| Token revocation (per-user) | DONE | `revokeRefreshForUser()` via Redis KEYS pattern |
| httpOnly cookie transport | DONE | Set in controller with secure/sameSite flags |
| Bearer token support | DONE | `ExtractJwt.fromAuthHeaderAsBearerToken()` |
| Dual extraction (cookie + header) | DONE | Custom extractor in JwtStrategy |
| Token type validation | DONE | `typ: 'access'` / `typ: 'refresh'` in payload |
| Passport.js JWT strategy | DONE | `JwtStrategy` with `@nestjs/passport` |
| JWT guard | DONE | `JwtGuard` exported and reusable |
| CASL RBAC | DONE | `CaslGuard` + `defineAbilityFor()` factory |
| Roles (super_admin, admin, manager, member) | DONE | TypeORM entity with enum + seeder |
| Permissions (CRUD + manage on subjects) | DONE | TypeORM entity with many-to-many to roles |
| User entity with status enum | DONE | active/pending/invited/suspended/disabled/deleted |
| Soft delete support | DONE | `deletedAt` timestamp column + `DELETED` status |
| Swagger/OpenAPI docs | DONE | Full API documentation on auth endpoints |
| Logout with token revocation | DONE | Clears cookies + revokes all refresh tokens |
| User profile endpoint | DONE | `GET /auth/me` with guard |

### What Needs to Be Added

| Capability | Complexity | Notes |
|---|---|---|
| Email/password registration | LOW | Add `signup()` method + validation; entity already supports it |
| Apple Sign-In | MEDIUM | Verify Apple ID token, link/create user |
| Google Sign-In | MEDIUM | Verify Google ID token, link/create user |
| Account deletion with 14-day grace | LOW | Set status to DELETED + deletedAt; cron purges after 14 days |
| Subscription tier in JWT claims | LOW | Add `subscriptionTier` to token payload |
| Password reset flow | MEDIUM | OTP entity already exists (`user_otp.entity.ts`) |
| Email verification | MEDIUM | OTP entity exists; Brevo email service already integrated |
| Rate limiting on auth endpoints | LOW | Add `@nestjs/throttler` (5 req/15 min per PRD) |

---

## Option 1: Better-Auth (Self-Hosted Library)

### What It Is

Better-Auth is a relatively new (late 2024) TypeScript-first authentication framework for Node.js. It aims to be a self-hosted alternative to managed auth services, providing social login, email/password, magic links, and more out of the box.

### Strengths

- **Self-hosted:** All data stays in your database. Full GDPR/CCPA compliance by default.
- **TypeScript-first:** Good type safety and DX.
- **Social login built-in:** Google, Apple, GitHub, and others via plugins.
- **Plugin architecture:** Extensible with official plugins for 2FA, organization management, etc.
- **Session management:** Built-in session handling with configurable strategies.
- **Free:** No per-user costs. MIT licensed.

### Weaknesses for PoshPet

| Issue | Severity | Detail |
|---|---|---|
| **No NestJS adapter** | HIGH | Better-Auth targets Express/Hono/Next.js. NestJS integration requires manual bridging -- mounting Better-Auth as Express middleware inside NestJS, handling DI manually, and working around NestJS's module system. |
| **No TypeORM support** | HIGH | Better-Auth's database adapters target Prisma, Drizzle, Kysely, and MongoDB. TypeORM is not officially supported. You would need to write a custom adapter or switch ORMs. |
| **Its own table schema** | MEDIUM | Better-Auth creates its own `user`, `session`, `account`, and `verification` tables. These do NOT map to your existing `users`, `roles`, `permissions`, `user_roles` tables. You would need to either migrate to its schema or maintain a mapping layer. |
| **Young ecosystem** | MEDIUM | Released late 2024. Community is growing but small compared to Passport.js. Documentation gaps exist for advanced patterns. Breaking changes still possible between minor versions. |
| **Replaces, not augments** | HIGH | Better-Auth is designed as a complete auth solution. It does not "plug into" existing auth -- it replaces it. Adopting it means ripping out all existing JWT logic, Passport strategy, guards, CASL integration, and rebuilding on top of Better-Auth's primitives. |
| **JWT pattern mismatch** | MEDIUM | Better-Auth uses session-based auth by default, not JWT access/refresh token pairs. JWT support exists but is secondary. The existing boilerplate's access+refresh pattern with Redis is actually more sophisticated than what Better-Auth provides by default. |

### Integration Effort Estimate

To adopt Better-Auth for PoshPet:

1. Write a custom TypeORM database adapter (~2-3 days)
2. Create NestJS module wrapper for Better-Auth (~1-2 days)
3. Migrate or map existing user/role tables to Better-Auth's schema (~1-2 days)
4. Rebuild CASL integration to work with Better-Auth's user model (~1 day)
5. Configure social login providers (~0.5 days)
6. Rewrite all existing auth tests (~1 day)
7. Debug integration issues between NestJS DI and Better-Auth internals (~1-3 days)

**Total: 7-14 days**, with risk of undocumented edge cases.

### Confidence: LOW-MEDIUM

Better-Auth was still pre-1.0 or very early 1.x in my training data. Current state may have improved. Verify NestJS and TypeORM support status against https://www.better-auth.com/docs before ruling it in or out.

---

## Option 2: Clerk (Managed Service)

### What It Is

Clerk is a managed authentication and user management service. It provides hosted login UI components, social login, MFA, organization management, and a backend SDK for verifying sessions.

### Strengths

- **Zero auth code to write:** Handles registration, login, social login, MFA, email verification -- all managed.
- **Social login trivial:** Apple, Google, and 20+ providers configured via dashboard.
- **Polished UI components:** Pre-built login/signup forms (though PoshPet is a mobile app, so these are less relevant).
- **Webhook system:** Fires events on user creation, update, deletion -- you sync to local DB.
- **Backend SDK:** `@clerk/backend` package for JWT verification, user management API.

### Weaknesses for PoshPet

| Issue | Severity | Detail |
|---|---|---|
| **Frontend-first design** | HIGH | Clerk's primary value is frontend components (`@clerk/nextjs`, `@clerk/react`). PoshPet is a backend API consumed by a mobile app. You get maybe 20% of Clerk's value. |
| **NestJS not officially supported** | HIGH | Clerk has official SDKs for Next.js, Express, Fastify, Remix. NestJS requires manual JWT verification using `@clerk/backend` or `jwks-rsa`. You are essentially doing the same JWT verify work you already do, but against Clerk's JWKS endpoint. |
| **User data split** | HIGH | User identity lives in Clerk. Domain data (pets, tasks, subscriptions) lives in your DB. You MUST sync via webhooks. Every user creation/update/deletion triggers a webhook that you process to keep local `users` table in sync. This is a permanent operational complexity. |
| **Webhook failure is a data integrity risk** | HIGH | If a Clerk webhook fails (network issue, your server is down, queue backup), your local DB is out of sync. You need retry logic, dead letter queues, and reconciliation jobs. For a solo developer, this is ongoing maintenance burden. |
| **Conflicts with "Privacy as Promise"** | MEDIUM | PoshPet PRD states: "Pet data is sacred; no selling, no ads, no third-party data sharing." While Clerk does not sell data, user emails, names, and auth metadata are stored on Clerk's infrastructure (US-based). European users' data leaves the EU unless you use Clerk's EU data residency (if available). |
| **Cost scales with users** | MEDIUM | Free tier covers development. Production costs scale per MAU. |
| **Vendor lock-in** | MEDIUM | User IDs are Clerk-assigned. Social login connections are Clerk-managed. Migrating away means re-authenticating all users or building a migration path for password hashes (which Clerk may not export). |
| **Existing auth becomes throwaway** | HIGH | All existing JWT logic, Passport strategy, refresh token system, CASL guard integration -- all thrown away and replaced with Clerk JWT verification. The CASL system stays but needs to read claims from Clerk's JWT format instead. |

### Pricing (as of training data, ~early 2025 -- VERIFY CURRENT PRICING)

| Tier | MAUs | Price | Notes |
|---|---|---|---|
| Free | Up to 10,000 | $0 | Limited to 5 social connections, community support |
| Pro | 10,000+ | $25/mo base + $0.02/MAU over 10K | Priority support, custom domain, advanced features |
| Enterprise | Custom | Custom | SSO, SLA, dedicated support |

**Cost projection for PoshPet:**

| Scale | Monthly Cost | Notes |
|---|---|---|
| 0 - 10K MAUs | $0 | Free tier covers MVP + early growth |
| 10K - 50K MAUs | $25 + $800 = $825/mo | 40K overage at $0.02/MAU |
| 50K - 100K MAUs | $25 + $1,800 = $1,825/mo | 90K overage at $0.02/MAU |

> **Note:** Clerk pricing has changed multiple times. The above may be outdated. Verify at https://clerk.com/pricing.

### Integration Pattern for NestJS

```typescript
// What Clerk + NestJS actually looks like:
// 1. Install @clerk/backend
// 2. Create a custom guard that verifies Clerk JWTs

import { clerkClient } from '@clerk/backend';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    try {
      // Verify against Clerk's JWKS
      const payload = await clerkClient.verifyToken(token);
      request.user = {
        clerkId: payload.sub,
        // Now you need to look up YOUR local user by clerkId
        // This is an extra DB query on EVERY request
      };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

// 3. Create webhook handler for user sync
@Controller('webhooks')
export class ClerkWebhookController {
  @Post('clerk')
  async handleClerkWebhook(@Body() body: any, @Headers() headers: any) {
    // Verify Svix signature
    // Handle user.created -> create local user
    // Handle user.updated -> update local user
    // Handle user.deleted -> soft delete local user
    // Handle session.created, session.revoked, etc.
  }
}
```

Compare this to the existing boilerplate which already does all of this natively with zero external dependency.

### Confidence: MEDIUM

Clerk is well-documented and stable. Pricing and NestJS integration patterns are well-known. However, exact current pricing tiers should be verified.

---

## Option 3: Extend Existing Boilerplate (RECOMMENDED)

### What Needs to Be Built

The existing boilerplate needs exactly 5 additions for PoshPet's auth requirements:

#### 1. User Registration Endpoint (~0.5 days)

```typescript
// Add to AuthService
async signup(dto: SignupDto): Promise<AuthResponse> {
  const existing = await this.userRepository.findByEmail(dto.email);
  if (existing) throw new ConflictException('Email already registered');

  const hashed = await bcrypt.hash(dto.password, 12);
  const user = await this.userRepository.save({
    email: dto.email,
    password: hashed,
    firstName: dto.firstName,
    lastName: dto.lastName,
    status: UserStatus.PENDING, // Until email verified
  });

  // Assign default 'member' role
  await this.userRoleRepository.save({ userId: user.id, roleId: memberRole.id });

  // Send verification email via Brevo (already integrated)
  await this.emailService.sendVerification(user.email, otp);

  // Generate tokens
  return this.generateAuthResponse(user);
}
```

#### 2. Apple Sign-In (~1-2 days)

```typescript
// Apple sends an identity token from the mobile app
// Backend verifies it using Apple's public keys
async appleSignIn(identityToken: string): Promise<AuthResponse> {
  // 1. Fetch Apple's JWKS from https://appleid.apple.com/auth/keys
  // 2. Verify the identity token signature + claims
  // 3. Extract email + Apple user ID from token
  // 4. Find or create user with apple provider link
  // 5. Generate JWT access + refresh tokens (existing logic)

  const applePayload = await this.verifyAppleToken(identityToken);
  const user = await this.findOrCreateSocialUser({
    provider: 'apple',
    providerId: applePayload.sub,
    email: applePayload.email,
  });
  return this.generateAuthResponse(user);
}
```

Libraries needed: `jsonwebtoken` (already have `@nestjs/jwt`), `jwks-rsa` for Apple JWKS fetching. Alternatively, use `apple-signin-auth` package (~2KB, well-maintained).

#### 3. Google Sign-In (~1 day)

```typescript
// Google sends an ID token from the mobile app
// Backend verifies using Google's token verification endpoint
async googleSignIn(idToken: string): Promise<AuthResponse> {
  // Use google-auth-library to verify
  const ticket = await this.googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  const user = await this.findOrCreateSocialUser({
    provider: 'google',
    providerId: payload.sub,
    email: payload.email,
    firstName: payload.given_name,
    lastName: payload.family_name,
  });
  return this.generateAuthResponse(user);
}
```

Library needed: `google-auth-library` (official Google package, very stable).

#### 4. Social Account Linking Table (~0.5 days)

```typescript
// New entity: user_social_accounts
@Entity('user_social_accounts')
export class UserSocialAccount extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => Users)
  @JoinColumn({ name: 'userId' })
  user: Users;

  @Column({ type: 'enum', enum: ['apple', 'google'] })
  provider: string;

  @Column()
  providerId: string; // Apple sub or Google sub

  @Column({ nullable: true })
  providerEmail: string;

  @Index(['provider', 'providerId'], { unique: true })
}
```

#### 5. Account Deletion with 14-Day Grace Period (~0.5 days)

```typescript
async requestAccountDeletion(userId: string): Promise<void> {
  const user = await this.userRepository.findOne({ where: { id: userId } });
  user.status = UserStatus.DELETED;
  user.deletedAt = new Date();
  await this.userRepository.save(user);

  // Revoke all sessions
  await this.revokeRefreshForUser(userId);

  // Send confirmation email
  await this.emailService.sendDeletionConfirmation(user.email);
}

async cancelAccountDeletion(userId: string): Promise<void> {
  const user = await this.userRepository.findOne({ where: { id: userId } });
  if (user.status !== UserStatus.DELETED) throw new BadRequestException();

  user.status = UserStatus.ACTIVE;
  user.deletedAt = null;
  await this.userRepository.save(user);
}

// Cron job: purge accounts where deletedAt < now - 14 days
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async purgeDeletedAccounts(): Promise<void> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const toDelete = await this.userRepository.find({
    where: { status: UserStatus.DELETED, deletedAt: LessThan(cutoff) },
  });

  for (const user of toDelete) {
    // Hard delete user data, anonymize, or cascade
    await this.hardDeleteUser(user.id);
  }
}
```

### Total Effort: 3-5 days

All of it builds on top of existing patterns. No new architectural concepts. No new ORM. No new module system. No webhook sync. No vendor dependency.

### What You Keep

- Full control over user data (GDPR/CCPA compliant by design)
- Existing CASL RBAC system works unchanged
- Existing JWT strategy works unchanged
- Existing cookie + bearer dual transport works unchanged
- TypeORM entity relationships work unchanged
- No per-user costs at any scale
- No vendor lock-in
- No webhook sync complexity

---

## Comparison Matrix

| Criterion | Extend Boilerplate | Better-Auth | Clerk |
|---|---|---|---|
| **Email/password auth** | Already done | Built-in | Built-in (managed) |
| **Apple Sign-In** | 1-2 days to add | Plugin available | Dashboard toggle |
| **Google Sign-In** | 1 day to add | Plugin available | Dashboard toggle |
| **JWT access + refresh** | Already done | Needs config (sessions by default) | Clerk-issued JWTs |
| **Redis-backed revocation** | Already done | Not built-in | N/A (Clerk manages) |
| **Token rotation** | Already done | Not standard | N/A (Clerk manages) |
| **CASL RBAC** | Already integrated | Need to rebuild integration | Need to rebuild integration |
| **TypeORM compatibility** | Native | No adapter (custom needed) | N/A (separate data store) |
| **NestJS compatibility** | Native | No adapter (manual bridging) | No official SDK (manual JWT verify) |
| **User data ownership** | Full (your DB) | Full (your DB, its schema) | Split (Clerk + your DB) |
| **GDPR/CCPA compliance** | Full control | Full control | Depends on Clerk DPA |
| **Account deletion grace** | 0.5 days to add | Custom implementation | Webhook + local logic |
| **Subscription tier in claims** | Add to JWT payload | Custom claims needed | Custom claims via metadata |
| **Stripe integration** | Direct (user.id = stripe customer) | Indirect | Indirect (map Clerk ID to Stripe) |
| **Setup time** | 3-5 days total | 7-14 days (with risks) | 3-5 days + ongoing webhook maintenance |
| **Ongoing maintenance** | Standard NestJS patterns | Watch for breaking changes | Monitor webhooks, sync, billing |
| **Cost at 10K users** | $0 | $0 | $0 (free tier) |
| **Cost at 50K users** | $0 | $0 | ~$825/mo |
| **Cost at 100K users** | $0 | $0 | ~$1,825/mo |
| **Risk level** | LOW (proven patterns) | MEDIUM-HIGH (young, no NestJS/TypeORM) | MEDIUM (vendor dependency, data split) |

---

## The "What About Social Login?" Counter-Argument

The strongest argument for Better-Auth or Clerk is "social login is complex." Let me address this directly.

### Social Login in 2026 is NOT Complex

Both Apple and Google sign-in follow the same pattern for mobile apps:

1. **Mobile app** handles the native sign-in flow (Apple AuthenticationServices / Google Sign-In SDK)
2. **Mobile app** receives an identity token (JWT) from Apple/Google
3. **Mobile app** sends this token to YOUR backend
4. **Backend** verifies the token against Apple/Google's public keys
5. **Backend** extracts user info (email, sub ID)
6. **Backend** finds or creates user, returns YOUR JWTs

Steps 1-3 are identical regardless of whether you use Clerk, Better-Auth, or custom code. The mobile app does the heavy lifting. Your backend just verifies a JWT -- which is something the existing boilerplate already knows how to do.

### Libraries That Make This Trivial

| Provider | Library | Maturity | Weekly Downloads (approx) |
|---|---|---|---|
| Apple | `apple-signin-auth` | Stable, maintained | ~15K |
| Google | `google-auth-library` | Official Google package | ~5M+ |

Each requires approximately 50-80 lines of code for the verification + user lookup logic. This is not a justification for adding an entire auth framework or managed service.

---

## GDPR/CCPA Implications

### Extend Boilerplate (Best for Compliance)

- All user data in YOUR PostgreSQL instance
- You control data residency (deploy DB in EU if needed)
- Account deletion is a direct database operation
- Data export is a direct database query
- No third-party data processors for auth data
- No DPA (Data Processing Agreement) needed for auth

### Better-Auth (Good for Compliance)

- Self-hosted, so same benefits as above
- Its own table schema means you need to know where it stores what
- Deletion requires understanding Better-Auth's data model

### Clerk (Requires Careful Handling)

- Must sign Clerk's DPA
- User PII (email, name, profile) stored on Clerk's servers
- Need to verify Clerk's data residency options for EU users
- Account deletion requires: delete from Clerk API + delete from your DB + verify both succeeded
- GDPR "right to access" requires merging data from Clerk + your DB
- If Clerk is down, users cannot authenticate (availability dependency)

---

## Impact on Existing Boilerplate

### Extend Boilerplate: Minimal Changes

| Component | Change Needed |
|---|---|
| `AuthModule` | Add social login services |
| `AuthService` | Add `signup()`, `appleSignIn()`, `googleSignIn()`, `requestDeletion()` |
| `AuthController` | Add new endpoints |
| `JwtStrategy` | No changes |
| `JwtGuard` | No changes |
| `CaslGuard` | No changes |
| `CaslFactory` | Update roles if needed (add `free_user`, `premium_user`) |
| `User entity` | Add `subscriptionTier` column |
| New entity | `UserSocialAccount` for provider links |
| New migration | Add `user_social_accounts` table + user columns |

### Better-Auth: Major Rewrite

| Component | Change Needed |
|---|---|
| `AuthModule` | REPLACE entirely with Better-Auth wrapper |
| `AuthService` | DELETE, replaced by Better-Auth API |
| `AuthController` | REPLACE with Better-Auth route handler |
| `JwtStrategy` | DELETE, Better-Auth handles sessions |
| `JwtGuard` | REPLACE with Better-Auth session guard |
| `CaslGuard` | REWRITE to read from Better-Auth user model |
| `CaslFactory` | REWRITE role mapping |
| `User entity` | MIGRATE to Better-Auth's user schema or maintain mapping |
| All tests | REWRITE |

### Clerk: Significant Rewrite + New Complexity

| Component | Change Needed |
|---|---|
| `AuthModule` | REPLACE with Clerk verification module |
| `AuthService` | DELETE most methods, add webhook handler, add Clerk ID mapping |
| `AuthController` | REDUCE to token verify + user lookup |
| `JwtStrategy` | REPLACE with Clerk JWT verification strategy |
| `JwtGuard` | REPLACE with Clerk auth guard |
| `CaslGuard` | REWRITE to read roles from local user (looked up by Clerk ID) |
| `User entity` | ADD `clerkId` column, remove `password` column |
| New controller | Webhook handler for Clerk events |
| New service | User sync service (Clerk -> local DB) |
| Redis refresh tokens | DELETE (Clerk manages sessions) |
| All tests | REWRITE + add webhook integration tests |

---

## Subscription Tier Integration

### With Extend Boilerplate (Simplest)

```
User signs up -> gets 'free' tier
User subscribes via Stripe -> Stripe webhook updates user.subscriptionTier = 'premium'
JWT payload includes subscriptionTier
CASL factory reads tier from JWT, grants premium permissions
```

One system. One source of truth. Direct Stripe customer ID = user ID linkage.

### With Clerk

```
User signs up -> created in Clerk + synced to local DB via webhook
User subscribes via Stripe -> Stripe webhook updates LOCAL user's tier
  -> Also need to update Clerk user metadata (optional but recommended)
JWT from Clerk includes custom claims (if configured)
  -> OR you look up tier from local DB on every request
CASL factory reads tier from... where? Clerk JWT? Local DB?
```

Two systems to keep in sync. Stripe talks to your DB. Clerk talks to your DB. You might need to talk to Clerk's API to update metadata. Three-way sync problem.

### With Better-Auth

```
User signs up -> created in Better-Auth's tables
User subscribes via Stripe -> update... which table? Better-Auth's user table? A custom table?
Session/JWT includes tier -> custom claims configuration
CASL factory reads from Better-Auth's user model
```

Need to understand Better-Auth's data model to know where to put subscription state.

---

## Final Recommendation

### EXTEND THE EXISTING BOILERPLATE

**Confidence: HIGH** (based on thorough codebase analysis)

**Reasoning:**

1. **You are 80% done.** The hardest parts of auth (JWT management, refresh token rotation, Redis revocation, CASL RBAC, cookie transport) are already built and working. Adding social login and registration is the easy 20%.

2. **Least risk.** No new library to learn, no schema migration, no integration debugging, no vendor dependency. Every line of auth code is yours to read, debug, and modify.

3. **Best for solo developer.** Fewer moving parts = fewer things to break = less 3 AM debugging. No webhook sync failures. No "is Clerk down?" incidents. No "Better-Auth released a breaking change" surprises.

4. **Best for PoshPet's values.** "Privacy as Promise" means keeping user data in your own database. No third-party auth service holding your users' emails and profiles.

5. **Best for Stripe integration.** Direct `user.id` = Stripe customer mapping. No intermediate ID translation layer.

6. **$0 at any scale.** Auth should not be a line item in your operating costs when the infrastructure to do it yourself already exists.

7. **No migration needed.** Clerk or Better-Auth would require migrating existing users later if you start with them and want to switch. Starting with your own auth means users are always in your database.

### When Would I Recommend Differently?

- **Choose Clerk IF:** You are building a web-first SaaS (not mobile), you are using Next.js, you have no existing auth code, and you value shipping login UI fast over long-term control. None of these apply to PoshPet.

- **Choose Better-Auth IF:** You are starting a new Express/Hono project from scratch, you use Prisma or Drizzle, you want social login + MFA + magic links + passkeys out of the box, and you do not mind being an early adopter. The TypeORM + NestJS combination makes this a poor fit today.

- **Roll your own (which is what I recommend) IF:** You have a working boilerplate with JWT + RBAC already, you are building a mobile-first app where the backend just verifies tokens, and you value control + simplicity + zero vendor cost. This is PoshPet.

---

## Implementation Roadmap for Extending Boilerplate

### Day 1: Registration + Email Verification
- Add `POST /auth/signup` endpoint
- Wire up Brevo email service for verification OTP
- Add email verification endpoint `POST /auth/verify-email`

### Day 2: Social Login (Google)
- Install `google-auth-library`
- Create `UserSocialAccount` entity + migration
- Add `POST /auth/google` endpoint
- Implement find-or-create user flow with account linking

### Day 3: Social Login (Apple)
- Install `apple-signin-auth`
- Add `POST /auth/apple` endpoint
- Handle Apple's "hide my email" relay addresses
- Handle Apple's "first sign-in only gives name" quirk

### Day 4: Account Lifecycle
- Add `POST /auth/delete-account` with 14-day grace period
- Add `POST /auth/cancel-deletion` to restore
- Add daily cron for purging expired deleted accounts
- Add `POST /auth/forgot-password` + `POST /auth/reset-password`

### Day 5: Subscription Tier + Polish
- Add `subscriptionTier` to User entity and JWT claims
- Update CASL factory with `free_user` and `premium_user` roles
- Add rate limiting to auth endpoints (5/15min)
- Write integration tests for all new flows

---

## Additional Libraries Needed

```bash
# Social login verification
npm install google-auth-library apple-signin-auth

# Rate limiting (auth endpoints)
npm install @nestjs/throttler

# Scheduled tasks (account deletion cron)
npm install @nestjs/schedule
```

**Total new dependencies: 4 packages.** Compare to Better-Auth (1 package + custom adapters + uncertainty) or Clerk (`@clerk/backend` + `svix` for webhooks + ongoing API calls).

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Social login token verification edge cases | LOW | MEDIUM | Apple and Google have well-documented verification flows; use official/maintained libraries |
| Apple "hide my email" complications | MEDIUM | LOW | Store Apple relay email; do not assume email = real email for Apple users |
| JWT secret rotation | LOW | MEDIUM | Already using configurable secrets; add rotation strategy in production |
| Redis failure = no token revocation | LOW | HIGH | Redis Sentinel or Upstash managed Redis; tokens still expire naturally at 15-min |
| Bcrypt timing attacks | VERY LOW | MEDIUM | `bcrypt.compare` is constant-time by design |
| Missing signup validation | LOW | LOW | Add class-validator DTOs (already used elsewhere in boilerplate) |

---

## Sources & Confidence

| Claim | Source | Confidence |
|---|---|---|
| Existing boilerplate analysis | Direct codebase reading | HIGH |
| Better-Auth features and limitations | Training data (mid-2025) | LOW-MEDIUM |
| Better-Auth NestJS/TypeORM support | Training data + inference | LOW (verify at better-auth.com/docs) |
| Clerk pricing | Training data (early 2025) | LOW (verify at clerk.com/pricing) |
| Clerk NestJS integration pattern | Training data + well-known patterns | MEDIUM |
| Apple Sign-In backend verification | Well-established pattern, training data | HIGH |
| Google Sign-In backend verification | Well-established pattern, google-auth-library docs | HIGH |
| GDPR/CCPA implications | Training data + established legal patterns | MEDIUM |

---

## Open Questions to Verify

1. **Better-Auth current version:** Has it released NestJS or TypeORM adapters since mid-2025? Check https://www.better-auth.com/docs/integrations
2. **Clerk current pricing:** Has the free tier limit changed? Check https://clerk.com/pricing
3. **Clerk NestJS SDK:** Has Clerk released an official NestJS adapter? Check https://clerk.com/docs/references/backend/overview
4. **Apple Sign-In changes:** Any new requirements for App Store submission regarding Sign in with Apple? Check Apple Developer docs.
5. **`apple-signin-auth` package status:** Still maintained? Check npm/GitHub for recent activity.

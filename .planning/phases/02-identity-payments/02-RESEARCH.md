# Phase 2: Identity & Payments - Research

**Researched:** 2026-03-02
**Domain:** Better-Auth (NestJS), Apple/Google ID token verification, Pet CRUD, Stripe subscriptions & webhooks
**Confidence:** HIGH (core stack verified via official docs and live codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Social Login & Account Linking
- Auto-merge accounts when a social provider (Apple/Google) email matches an existing email/password account — requires the social provider's email to be verified
- On first social sign-in (new account): pull name, email, and avatar URL from the provider to pre-populate the user profile — user can edit later
- Social-only users can set a password from account settings at any time, giving them email/password as a fallback login method
- Apple Sign-In relay emails (privaterelay.appleid.com) are accepted as-is — transactional emails go through Apple's relay, respecting user privacy

#### Pet Onboarding Flow
- Pet creation is mandatory immediately after registration — the app is meaningless without a pet, so the backend should enforce at least one pet exists before granting full access
- Required fields at pet creation: name, species, birthday — breed and avatar photo are optional (can be added later)
- 14 supported species (stored as varchar, not PG enum): dog, cat, fish, bird, rabbit, guinea_pig, hamster, ferret, chinchilla, hedgehog, bearded_dragon, leopard_gecko, snake, turtle
- Backend tracks `active_pet_id` on the user record for cross-device consistency — API requests can scope to the active pet

#### Subscription Lifecycle
- 7-day free trial for new premium subscribers (configured via Stripe's trial period feature)
- Payment failure handling: let Stripe's dunning process manage retries entirely — only downgrade the user when Stripe sends the `customer.subscription.deleted` webhook (no custom retry logic)
- Optimistic premium access: after Stripe Checkout completes and redirects back, treat the user as premium immediately — the webhook confirms shortly after, and a background reconciliation catches edge cases
- Seamless plan switching (monthly <-> annual) via Stripe Customer Portal — Stripe handles prorations automatically

#### Downgrade & Deletion Behavior
- "View-only" for 2nd+ pets on downgrade means: user can view all pet data (health records, timeline, photos) but cannot edit pet details, add new records, or complete tasks for those pets
- On downgrade, user chooses which pet remains fully active — the backend supports a "select primary pet" endpoint, and the frontend prompts the user when downgrade is detected
- Account deletion: user can cancel deletion and fully restore their account at any point during the 14-day grace period
- During the deletion grace period: full access to the app — backend tracks `deletion_scheduled_at` timestamp, frontend shows a persistent cancellation banner

### Claude's Discretion
- Better-Auth adapter configuration details and session management internals
- JWT token structure and claims beyond what's specified (15-min access, 7-day refresh)
- Stripe webhook signature verification implementation details
- Database schema specifics (indexes, constraints, migration structure)
- Error response formats for auth failures (within the API conventions established in Phase 1)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Email/password registration with email verification | Better-Auth `emailAndPassword` plugin with `sendVerificationEmail` hook wired to Brevo EmailService |
| AUTH-02 | Apple Sign-In (mobile ID token verification) | Better-Auth `socialProviders.apple` with `appBundleIdentifier` for mobile bundle ID flow |
| AUTH-03 | Google Sign-In (mobile ID token verification) | Better-Auth `socialProviders.google` with ID token flow (no redirect) |
| AUTH-04 | JWT access tokens (15-minute expiry) | Better-Auth session issues its own tokens; custom JWT layer handles access token generation |
| AUTH-05 | JWT refresh tokens (7-day expiry, single-use, rotated on refresh) | Existing `AuthService.generateRefreshToken()` + Redis `rt:{userId}:{jti}` pattern kept |
| AUTH-06 | Refresh token stored in Redis (not DB) | Existing Redis pattern in `AuthService` retained and extended |
| AUTH-07 | Password reset via email link | Better-Auth `sendResetPassword` callback wired to Brevo EmailService |
| AUTH-08 | Role-based access: free, premium, superadmin | `UserRole` enum already defined; existing `RolesGuard` + `@Roles()` decorator already in codebase |
| AUTH-09 | PremiumGuard / @RequiresPremium() decorator | New `PremiumGuard` implementing `CanActivate` checking `user.role === 'premium'` |
| AUTH-10 | Admin JWT contains 'superadmin' claim | JWT payload includes `role` claim; 'superadmin' value gates admin routes via `@Roles(UserRole.SUPERADMIN)` |
| AUTH-11 | Login rate limiting: 5 failures per 15 min per IP, then 30-min lockout | Custom `LoginAttemptsService` using Redis `INCR` + TTL; `@nestjs/throttler` `@Throttle()` override on auth endpoints |
| AUTH-12 | Better-Auth integration with NestJS adapter (@thallesp/nestjs-better-auth) | Critical: requires `bodyParser: false` in main.ts; use `enableRawBodyParser: true` for Stripe webhook compatibility |
| AUTH-13 | TypeORM adapter for Better-Auth (@hedystia/better-auth-typeorm) | Pass existing DataSource to `typeormAdapter(dataSource)`; run `npx @better-auth/cli generate` to produce entities |
| AUTH-14 | 2FA required for admin panel access | Better-Auth `twoFactor()` plugin; enforced at route level for admin endpoints |
| USER-01 | User profile: name, email, avatar URL, timezone, created_at | Extend existing `Users` entity with `avatarUrl`, `timezone`, Better-Auth required fields |
| USER-02 | Account deletion with 14-day grace period (type 'DELETE' confirmation) | `deletion_scheduled_at` column; cron job (Phase 7) does permanent deletion; full access during grace period |
| USER-03 | All personal data permanently deleted within 30 days | Handled by Phase 7 GDPR cron; schema design decision here: track `deletion_scheduled_at` |
| USER-04 | Health disclaimer acknowledgment tracking | Add `health_disclaimer_acknowledged` boolean + `health_disclaimer_acknowledged_at` timestamp to Users entity |
| USER-05 | User can edit name, email, pet info directly in app | Standard PUT /v1/users/me endpoint |
| USER-06 | Age requirement: 13+ (COPPA), 16+ for EU (GDPR) | DTO validation; `birthdate` field on registration; server-side age check with region detection |
| PET-01 | Pet CRUD: name, species, breed, birthday, avatar photo | New `Pet` entity + 7 CRUD endpoints |
| PET-02 | 14 species supported | `species` as `varchar(30)` with TypeScript union type; enum-style validation in DTO |
| PET-03 | 1 free pet, unlimited pets for premium | Guard checks `user.role` + pet count before creation |
| PET-04 | Pet selector / multi-pet switching context | `active_pet_id` FK on Users; `PUT /v1/users/me/active-pet` endpoint |
| PET-05 | Soft-delete pets with 90-day recovery period | TypeORM `@DeleteDateColumn` + `softDelete()` / `restore()` pattern |
| PET-06 | On premium downgrade: second+ pets become view-only | `is_active` boolean on Pet derived from subscription check; or runtime check against user.role |
| PET-07 | 7 CRUD endpoints for pets | POST, GET (list), GET (single), PUT, DELETE (soft), POST (restore), PUT (set active) |
| SUB-01 | Stripe integration for subscription management | `stripe` npm package; StripeService wrapping Stripe client |
| SUB-02 | Two price tiers: $14.99/month, $149.99/year | `STRIPE_PRICE_MONTHLY` + `STRIPE_PRICE_ANNUAL` env vars |
| SUB-03 | Stripe Checkout for subscription creation | `stripe.checkout.sessions.create({ mode: 'subscription', subscription_data: { trial_period_days: 7 } })` |
| SUB-04 | Stripe Customer Portal for subscription management | `stripe.billingPortal.sessions.create({ customer: customerId, return_url })` |
| SUB-05–10 | 6 webhook events | `enableRawBodyParser: true`; `stripe.webhooks.constructEvent(rawBody, sig, secret)`; idempotency via `webhook_events` table |
| SUB-11 | subscriptions table schema | `Subscription` entity with `status`, `plan`, `stripe_customer_id`, `stripe_subscription_id` |
| SUB-12 | Graceful downgrade: data preserved, premium features locked | On `customer.subscription.deleted` webhook: set `user.role = free`; pets become view-only |
| SUB-13 | Raw body parsing for Stripe webhook signature verification | Solved by `enableRawBodyParser: true` in `AuthModule.forRoot()` |
| SUB-14 | STRIPE_PRICE_MONTHLY and STRIPE_PRICE_ANNUAL env vars | Add to `configuration.ts` and `env.validation.ts` |
</phase_requirements>

---

## Summary

Phase 2 replaces the Phase 1 boilerplate auth (passport-jwt) with Better-Auth (`@thallesp/nestjs-better-auth` + `@hedystia/better-auth-typeorm`), adds complete user/pet management, and integrates Stripe subscriptions with webhook handling. The codebase already has the infrastructure that Phase 2 needs: Redis, BullMQ, Brevo EmailService, RolesGuard, and the `UserRole` enum. What's needed is wiring these pieces together into a coherent auth and billing system.

The most critical architectural decision is the `bodyParser: false` requirement for Better-Auth. The current `main.ts` does NOT have this — it must be added in Phase 2. The `enableRawBodyParser: true` option in `AuthModule.forRoot()` provides Stripe webhook raw body access without conflicting with Better-Auth's body parser management. This is the production-correct solution for the raw body conflict.

The existing boilerplate auth module (`src/modules/auth/`) is a custom passport-jwt implementation. Per PROJECT.md, Better-Auth replaces it — meaning the existing `AuthService`, `JwtStrategy`, `JwtGuard`, and the existing auth controller endpoints need to be either replaced or co-exist. The cleanest approach is to replace the boilerplate auth module with Better-Auth session management while keeping the custom JWT token generation service for mobile clients that expect Bearer tokens.

**Primary recommendation:** Install and configure Better-Auth with TypeORM adapter first (Wave 1), then build Pet module (Wave 2), then Stripe subscriptions (Wave 3). Treat them as independent waves that build on each other.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | ^1.3.8+ | Authentication core (sessions, social login, email verification) | Self-hosted, has NestJS + TypeORM adapters, Apple/Google mobile ID token support built-in |
| `@thallesp/nestjs-better-auth` | latest | NestJS integration for Better-Auth | Required by PROJECT.md; provides `AuthModule.forRoot()`, `@Session()`, `@AllowAnonymous()`, `@Roles()` |
| `@hedystia/better-auth-typeorm` | latest | TypeORM adapter for Better-Auth database layer | Required by PROJECT.md; wires existing TypeORM DataSource to Better-Auth |
| `stripe` | ^17+ | Stripe API client | Official Stripe Node.js SDK; `stripe.webhooks.constructEvent()` for signature verification |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ioredis` | (already installed) | Refresh token storage, login attempt counters | Redis patterns already established in AuthService |
| `@nestjs/throttler` | ^6.5.0 (already installed) | Rate limiting | Already configured globally; override with `@Throttle()` on auth routes |
| `class-validator` | ^0.14.2 (already installed) | DTO validation including species enum, age checks | Already in global ValidationPipe |
| `bcryptjs` | ^3.0.2 (already installed) | Password hashing (12 rounds) | Already used in AuthService |

### Already Installed (No New Installs Needed Except Better-Auth + Stripe)
The boilerplate already contains: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcryptjs`, `ioredis`, `@nestjs/throttler`, `@nestjs/bullmq`, `brevo`, `class-validator`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@hedystia/better-auth-typeorm` | `@luratnieks/better-auth-typeorm-adapter` | Hedystia is the package specified in PROJECT.md; use it |
| Custom JWT + passport | Better-Auth sessions | PROJECT.md explicitly replaces passport-jwt with Better-Auth |
| Stripe SDK directly | `@golevelup/nestjs-stripe` | Direct SDK is simpler; community wrappers add unnecessary indirection |

**Installation:**
```bash
npm install better-auth @thallesp/nestjs-better-auth @hedystia/better-auth-typeorm stripe
```

---

## Architecture Patterns

### Recommended Module Structure for Phase 2
```
src/
├── modules/
│   ├── auth/                    # REPLACE boilerplate — Better-Auth integration
│   │   ├── auth.config.ts       # betterAuth({ ... }) instance export
│   │   ├── auth.module.ts       # AuthModule.forRoot({ auth, enableRawBodyParser: true })
│   │   └── auth.controller.ts   # Minimal — Better-Auth handles /api/auth/* routes
│   ├── user/                    # EXTEND existing — add profile, deletion, disclaimer
│   │   ├── core/entities/
│   │   │   └── user.entity.ts   # Add: avatarUrl, timezone, activePetId, deletionScheduledAt, healthDisclaimerAcknowledged
│   │   ├── application/services/
│   │   │   └── user.service.ts  # Add: updateProfile, initiateDelete, cancelDelete, acknowledgeDisclaimer
│   │   └── presentation/
│   │       └── user.controller.ts  # PUT /me, DELETE /me, POST /me/restore, POST /me/acknowledge-disclaimer
│   ├── pet/                     # NEW module
│   │   ├── core/entities/
│   │   │   └── pet.entity.ts   # name, species(varchar30), breed, birthday, avatarUrl, @DeleteDateColumn
│   │   ├── application/services/
│   │   │   └── pet.service.ts  # CRUD + soft-delete + restore + activePet
│   │   └── presentation/
│   │       └── pet.controller.ts   # 7 endpoints under /v1/pets
│   └── subscription/            # NEW module
│       ├── core/entities/
│       │   ├── subscription.entity.ts      # status, plan, stripe_customer_id, etc.
│       │   └── webhook-event.entity.ts     # stripeEventId, status (idempotency)
│       ├── application/services/
│       │   ├── stripe.service.ts           # createCheckoutSession, createPortalSession
│       │   └── webhook.service.ts          # processEvent() switch on event type
│       └── presentation/
│           └── subscription.controller.ts  # POST /checkout, POST /portal, POST /webhook
├── common/
│   ├── decorators/
│   │   └── requires-premium.decorator.ts  # @RequiresPremium()
│   └── guards/
│       ├── roles.guard.ts      # Already exists
│       └── premium.guard.ts    # NEW: checks user.role === 'premium' || 'superadmin'
├── better-auth/                 # Generated by CLI
│   ├── entities/               # user, session, account, verification tables
│   └── migrations/             # Initial Better-Auth schema migrations
```

### Pattern 1: Better-Auth Configuration (auth.config.ts)
**What:** Single-file Better-Auth instance that NestJS `AuthModule.forRoot()` consumes
**When to use:** All auth configuration lives here; NestJS modules import from this file

```typescript
// Source: https://www.better-auth.com/docs/integrations/nestjs
// src/modules/auth/auth.config.ts
import { betterAuth } from 'better-auth';
import { typeormAdapter } from '@hedystia/better-auth-typeorm';
import { dataSource } from '@/shared/config/typeorm.datasource';
import { twoFactor } from 'better-auth/plugins';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,      // e.g. https://api.poshpet.app
  basePath: '/api/auth',                      // matches NestJS global prefix
  database: typeormAdapter(dataSource),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Fire-and-forget BullMQ enqueue — do NOT await (timing attack prevention)
      await emailService.send({
        type: EmailType.VERIFICATION,
        to: user.email,
        params: { name: user.name, url },
      });
    },
    sendResetPassword: async ({ user, url }) => {
      await emailService.send({
        type: EmailType.PASSWORD_RESET,
        to: user.email,
        params: { name: user.name, url },
      });
    },
  },
  socialProviders: {
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,  // Required for mobile
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'apple'],   // Auto-merge verified emails (CONTEXT: locked decision)
    },
  },
  plugins: [twoFactor()],   // AUTH-14: for superadmin 2FA
  hooks: {},                 // Required for @Hook() decorators in NestJS
});
```

### Pattern 2: main.ts Changes (bodyParser: false)
**What:** Better-Auth requires NestJS body parser to be disabled
**When to use:** This is a MANDATORY breaking change to main.ts

```typescript
// Source: https://github.com/ThallesP/nestjs-better-auth
// CRITICAL: main.ts must add bodyParser: false
const app = await NestFactory.create(AppModule, {
  bodyParser: false,     // Better-Auth manages its own body parsing
  logger: ['debug', 'log', 'warn'],
  bufferLogs: true,
});
```

### Pattern 3: AuthModule Registration with Raw Body for Stripe
**What:** Import Better-Auth module with `enableRawBodyParser: true` so Stripe webhook can access `req.rawBody`
**When to use:** Any NestJS app using Better-Auth + Stripe webhooks

```typescript
// Source: https://github.com/ThallesP/nestjs-better-auth
// src/app/app.module.ts
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '@/modules/auth/auth.config';

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
      enableRawBodyParser: true,   // SUB-13: Stripe webhook raw body access
    }),
    // ... rest of imports
  ],
})
export class AppModule {}
```

### Pattern 4: Better-Auth Session in Controllers
**What:** Use `@Session()` decorator (from nestjs-better-auth) instead of `req.user`
**When to use:** All authenticated routes that need user identity post-Better-Auth migration

```typescript
// Source: https://github.com/ThallesP/nestjs-better-auth
import { Session, AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { UserSession } from 'better-auth/types';

@Get('me')
async getProfile(@Session() session: UserSession) {
  return session.user;   // session.user has id, email, name, role
}

@Get('public-route')
@AllowAnonymous()
async publicRoute() { ... }
```

### Pattern 5: Stripe Webhook with Raw Body Verification
**What:** Webhook handler that verifies Stripe signature using raw body
**When to use:** `POST /v1/subscriptions/webhook` endpoint only

```typescript
// Source: https://docs.stripe.com/webhooks/signature + NestJS integration
@Post('webhook')
@AllowAnonymous()          // Stripe doesn't send auth headers
async handleWebhook(
  @Req() req: Request,
  @Headers('stripe-signature') signature: string,
) {
  const rawBody = (req as any).rawBody as Buffer;
  let event: Stripe.Event;
  try {
    event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    throw new BadRequestException('Invalid webhook signature');
  }
  await this.webhookService.processEvent(event);
  return { received: true };
}
```

### Pattern 6: Stripe Webhook Idempotency
**What:** Prevent duplicate processing of Stripe events (Stripe retries on non-200)
**When to use:** All 6 webhook event handlers

```typescript
// Source: https://dev.to/aniefon_umanah_ac5f21311c/building-reliable-stripe-subscriptions-in-nestjs
async processEvent(event: Stripe.Event): Promise<void> {
  // Check idempotency — return if already processed
  const existing = await this.webhookEventRepo.findOne({
    where: { stripeEventId: event.id },
  });
  if (existing?.status === 'processed') return;

  // Mark as processing (prevents parallel duplicate)
  await this.webhookEventRepo.save({
    stripeEventId: event.id,
    status: 'processing',
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
    await this.webhookEventRepo.update(
      { stripeEventId: event.id },
      { status: 'processed', processedAt: new Date() },
    );
  } catch (err) {
    await this.webhookEventRepo.update(
      { stripeEventId: event.id },
      { status: 'failed', error: err.message },
    );
    throw err;   // Re-throw so Stripe retries
  }
}
```

### Pattern 7: Pet Soft Delete with 90-Day Recovery
**What:** TypeORM `@DeleteDateColumn` for soft delete; `softDelete()` and `restore()` for recovery
**When to use:** `DELETE /v1/pets/:id` and `POST /v1/pets/:id/restore`

```typescript
// Source: TypeORM official docs (https://typeorm.io/)
@Entity('pets')
export class Pet extends BaseEntity {
  @Column('varchar', { length: 50 })
  name: string;

  @Column('varchar', { length: 30 })
  species: string;   // PET-02: varchar not enum — allows future expansion

  @Column({ type: 'date', nullable: true })
  birthday: Date;

  @Column('varchar', { length: 50, nullable: true })
  breed?: string;

  @Column('varchar', { length: 500, nullable: true })
  avatarUrl?: string;

  @ManyToOne(() => Users)
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column('uuid')
  userId: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date;   // PET-05: null = active, set = soft-deleted
}

// Soft delete (PET-05)
await petRepository.softDelete(petId);

// Restore within 90-day window (PET-05)
await petRepository.restore(petId);

// Query deleted pets (for recovery UI)
await petRepository.findOne({
  where: { id: petId },
  withDeleted: true,
});
```

### Pattern 8: @RequiresPremium() Guard
**What:** Custom guard + decorator that gates premium-only endpoints
**When to use:** Any endpoint that requires `UserRole.PREMIUM` or `UserRole.SUPERADMIN`

```typescript
// src/common/guards/premium.guard.ts
@Injectable()
export class PremiumGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    return user?.role === UserRole.PREMIUM || user?.role === UserRole.SUPERADMIN;
  }
}

// src/common/decorators/requires-premium.decorator.ts
export const RequiresPremium = () => applyDecorators(
  UseGuards(PremiumGuard),
  ApiBearerAuth(),
  ApiResponse({ status: 403, description: 'Premium subscription required' }),
);
```

### Pattern 9: Stripe Checkout Session (7-day trial)
**What:** Create a subscription checkout session with free trial
**When to use:** `POST /v1/subscriptions/checkout` endpoint

```typescript
// Source: https://docs.stripe.com/api/checkout/sessions/create
async createCheckoutSession(userId: string, plan: 'monthly' | 'annual') {
  const priceId = plan === 'monthly'
    ? process.env.STRIPE_PRICE_MONTHLY
    : process.env.STRIPE_PRICE_ANNUAL;

  // Ensure Stripe customer exists or create one
  let subscription = await this.subscriptionRepo.findOne({ where: { userId } });
  let customerId = subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await this.stripe.customers.create({
      metadata: { userId },
    });
    customerId = customer.id;
  }

  const session = await this.stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,   // SUB locked decision: 7-day free trial
      metadata: { userId },
    },
    success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
    metadata: { userId },
  });

  return { url: session.url };
}
```

### Anti-Patterns to Avoid
- **Keeping passport-jwt alongside Better-Auth:** Remove `@nestjs/passport`, `passport-jwt`, and the existing `JwtStrategy`/`JwtGuard` in the auth module. Better-Auth fully replaces them. Keeping both creates guard conflicts.
- **Setting `bodyParser: true` globally:** This breaks Better-Auth. Use `bodyParser: false` + `enableRawBodyParser: true` in `AuthModule.forRoot()`.
- **Using PG ENUM for species:** Species must be `varchar(30)` (CONTEXT decision). PG ENUMs require migrations to add new values.
- **Custom retry logic for payment failures:** Do not implement custom dunning. CONTEXT decision: let Stripe handle retries; only act on `customer.subscription.deleted`.
- **Awaiting email sends in Better-Auth hooks:** The `sendVerificationEmail` callback must NOT await email sending (timing attack prevention). Enqueue to BullMQ instead.
- **Storing raw body manually:** Do not override NestJS body parsing with a custom middleware for raw body. Use `enableRawBodyParser: true` in `AuthModule.forRoot()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email/password auth with verification | Custom OTP + verification service | Better-Auth `emailAndPassword` plugin | Handles timing-safe token comparison, token expiry, resend logic |
| Social login token verification | Manual JWT decode + Apple JWKS fetch | Better-Auth `socialProviders.apple/google` | Handles JWKS rotation, nonce validation, bundle ID aud verification |
| Account linking (social + email) | Custom merge logic | Better-Auth `accountLinking.trustedProviders` | Handles race conditions, verified-email requirement |
| Password hashing | Custom bcrypt wrapper | Better-Auth stores passwords in account table with scrypt | Already covered by Better-Auth internals |
| Stripe event idempotency | Custom dedup table from scratch | Established pattern: `webhook_events` entity + status field | Stripe retries are guaranteed — must be idempotent |
| Soft delete with auto-exclusion | Manual `WHERE deleted_at IS NULL` | TypeORM `@DeleteDateColumn` | Automatically adds filter to all repository queries |
| 2FA enforcement for admin | Custom TOTP + secret storage | Better-Auth `twoFactor()` plugin | Handles secret generation, TOTP verification, recovery codes |

**Key insight:** Better-Auth covers the entire auth surface area. Building custom auth flows on top of it (or around it) creates maintenance burden and security gaps. Trust the library for auth, trust Stripe for billing state.

---

## Common Pitfalls

### Pitfall 1: bodyParser Conflict Between Better-Auth and Stripe
**What goes wrong:** With `bodyParser: false` in main.ts, Stripe raw body (`req.rawBody`) is unavailable unless explicitly re-enabled, causing webhook signature verification to fail with `No signatures found matching the expected signature`.
**Why it happens:** Better-Auth disables NestJS body parsing and re-adds its own. NestJS's native `rawBody: true` option has no effect when `bodyParser: false` is set.
**How to avoid:** Set `enableRawBodyParser: true` in `AuthModule.forRoot({ auth, enableRawBodyParser: true })`. This re-attaches raw body buffer via Better-Auth's middleware.
**Warning signs:** Stripe signature verification throws `WebhookSignatureVerificationError` in production. Works fine in testing where raw body is manually set.

### Pitfall 2: Apple appBundleIdentifier Missing for Mobile
**What goes wrong:** iOS app gets `JWTClaimValidationFailed: unexpected 'aud' claim value` when authenticating.
**Why it happens:** Apple mobile apps use the Bundle ID (e.g., `com.poshpet.app`) as the OAuth client ID, not the Service ID used for web redirects. Without `appBundleIdentifier`, Better-Auth validates the `aud` claim against the Service ID, causing mismatch.
**How to avoid:** Always set `appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER` in the Apple social provider config.
**Warning signs:** Apple Sign-In works on web but fails on iOS.

### Pitfall 3: Better-Auth Global AuthGuard Blocks /v1/subscriptions/webhook
**What goes wrong:** Stripe webhook POST requests fail with 401 because Better-Auth's globally-registered `AuthGuard` requires a session token that Stripe doesn't send.
**How to avoid:** Decorate the webhook handler method with `@AllowAnonymous()` from `@thallesp/nestjs-better-auth`. Also apply to Stripe callback return URLs.
**Warning signs:** Stripe Dashboard shows 401 errors in webhook attempts.

### Pitfall 4: Webhook Processed Twice (Race Condition)
**What goes wrong:** Stripe retries a webhook while the first delivery is still processing. Both succeed — user gets upgraded twice or gets two emails.
**Why it happens:** Stripe retries any event that doesn't receive a 200 within 30 seconds. Network latency + slow DB queries cause duplicate delivery.
**How to avoid:** Implement idempotency guard: check `webhook_events` table for `stripeEventId` before processing. Use `UNIQUE` constraint on `stripeEventId` column so concurrent inserts fail safely. The pattern: check → insert with `status: 'processing'` → process → update to `status: 'processed'`.
**Warning signs:** Subscription records show duplicate history, users receive duplicate upgrade emails.

### Pitfall 5: DataSource Initialization Order (Better-Auth + TypeORM)
**What goes wrong:** `typeormAdapter(dataSource)` is called before `dataSource.initialize()` completes, causing `QueryFailedError: relation "user" does not exist`.
**Why it happens:** NestJS module initialization is async. If the DataSource passed to Better-Auth hasn't connected to Postgres yet, Better-Auth's queries fail.
**How to avoid:** In NestJS, use the TypeORM DataSource that's already initialized by `TypeOrmModule.forRootAsync()`. Reference the same DataSource instance. Create the Better-Auth instance lazily (as a factory) or ensure it's created after NestJS bootstraps TypeORM. Alternatively, create the auth config in an `AuthModule` provider that injects `DataSource` from TypeORM.
**Warning signs:** App starts but first auth request fails; health check shows DB connected but auth fails.

### Pitfall 6: PG ENUM Migration Nightmare for Species
**What goes wrong:** Species stored as PG ENUM. Adding "axolotl" species in Phase 3 requires a migration that locks the table.
**Why it happens:** PG ENUM values cannot be added within a transaction.
**How to avoid:** Store species as `varchar(30)` with TypeScript union type validation in the DTO. DTO validation catches invalid species at request time; no migration needed to expand species list.
**Warning signs:** Attempt to add species in production requires `ALTER TYPE ... ADD VALUE` which cannot be done in a transaction.

### Pitfall 7: Optimistic Premium Access + Webhook Delay
**What goes wrong:** User completes Stripe Checkout, gets redirected back, but the webhook fires 2-30 seconds later. If the UI immediately checks `/me`, the user still shows as `free`.
**Why it happens:** CONTEXT decision is "treat as premium immediately after redirect" — this means the backend must grant optimistic access on the `checkout.session.completed` redirect, not wait for webhook.
**How to avoid:** Add `POST /v1/subscriptions/optimistic-activate` endpoint: client sends `session_id` after Stripe redirect; backend verifies session with `stripe.checkout.sessions.retrieve(sessionId)` and upgrades user role immediately. Webhook confirms shortly after — idempotency handles the double-update gracefully.
**Warning signs:** Users complain "I paid but app still shows free tier" after successful checkout.

### Pitfall 8: 14-Day Deletion Grace Period + Data Access
**What goes wrong:** User initiates deletion, continues using app during grace period, then tries to cancel — but if the grace period implementation soft-deletes immediately, restore fails on foreign key constraints.
**Why it happens:** CONTEXT decision: full access during grace period; backend tracks `deletion_scheduled_at`, NOT `deletedAt`. Do not soft-delete the user record on deletion initiation.
**How to avoid:** Use a separate `deletion_scheduled_at TIMESTAMP WITH TIME ZONE` column on the Users entity. A Phase 7 cron job checks this and performs hard deletion at day 30. Cancellation sets `deletion_scheduled_at = NULL`.

---

## Code Examples

### Better-Auth Entity Generation (Run Once)
```bash
# Source: https://github.com/Zastinian/better-auth-typeorm
# Generates Better-Auth entities (user, session, account, verification) as TypeScript files
npx @better-auth/cli generate

# Output: typeorm/entities/ and typeorm/migrations/
# These entities MUST be registered in TypeORM's autoLoadEntities path
```

### Users Entity Extensions Needed for Phase 2
```typescript
// Source: codebase inspection + requirements
// src/modules/user/core/entities/user.entity.ts — additions needed:
@Column('varchar', { length: 500, nullable: true })
avatarUrl?: string;                          // USER-01, pre-populated from social login

@Column('varchar', { length: 50, nullable: true })
timezone?: string;                           // USER-01, e.g. 'America/New_York'

@Column('uuid', { nullable: true })
activePetId?: string;                        // PET-04: cross-device pet context

@Column({ type: 'timestamp with time zone', nullable: true })
deletionScheduledAt?: Date;                  // USER-02: 14-day grace period; NOT deletedAt

@Column({ type: 'boolean', default: false })
healthDisclaimerAcknowledged: boolean;       // USER-04

@Column({ type: 'timestamp with time zone', nullable: true })
healthDisclaimerAcknowledgedAt?: Date;       // USER-04

@Column('varchar', { length: 10, nullable: true })
ageVerificationRegion?: string;              // USER-06: 'EU' | 'OTHER' for COPPA/GDPR
```

### Stripe Portal Session (SUB-04)
```typescript
// Source: https://docs.stripe.com/api/customer_portal/sessions/create
async createPortalSession(userId: string, returnUrl: string) {
  const subscription = await this.subscriptionRepo.findOneOrFail({
    where: { userId },
  });
  const session = await this.stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}
```

### Login Rate Limiting (AUTH-11)
```typescript
// Source: https://github.com/nestjs/throttler + Redis INCR pattern
// AUTH-11: 5 failures per 15 min per IP, then 30-min lockout
// @nestjs/throttler handles general rate limiting; custom Redis counter tracks failures

// Override global throttler for auth routes
@Throttle({ default: { limit: 20, ttl: 900000 } })  // 20 req / 15 min per IP on auth endpoints
@Controller('auth')
export class AuthController { ... }

// Redis-based failure counter (injected into auth service)
async checkLoginFailures(ip: string): Promise<void> {
  const key = `login_failures:${ip}`;
  const lockKey = `login_lockout:${ip}`;

  const isLocked = await this.redis.exists(lockKey);
  if (isLocked) throw new TooManyRequestsException('Account locked for 30 minutes');

  const failures = await this.redis.incr(key);
  if (failures === 1) await this.redis.expire(key, 900);  // 15 min window
  if (failures >= 5) {
    await this.redis.setex(lockKey, 1800, '1');  // 30 min lockout
  }
}

async clearLoginFailures(ip: string): Promise<void> {
  await this.redis.del(`login_failures:${ip}`);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| passport-jwt + custom strategies | Better-Auth sessions | 2024 (Better-Auth v1) | Single library handles social login, email verification, 2FA, account linking |
| `rawBody: true` in NestFactory | `enableRawBodyParser: true` in AuthModule.forRoot | Better-Auth v1.3.8+ | Raw body available to Stripe without conflicting with Better-Auth's body parsing |
| PG ENUM for type columns | `varchar` + TypeScript union type | Ongoing best practice | Zero-migration species/type expansion |
| `synchronize: true` for schema | TypeORM CLI migrations only | PROJECT.md decision | Prevents accidental schema destruction; `npx @better-auth/cli generate` produces migration files |
| Manual retry logic for failed payments | Stripe dunning process + `subscription.deleted` | Stripe best practice | Eliminates custom retry complexity; Stripe handles grace periods natively |

**Deprecated/outdated in this codebase:**
- `@nestjs/passport` + `passport-jwt` + `JwtStrategy`: Remove when Better-Auth is installed. Better-Auth's `AuthGuard` (from `@thallesp/nestjs-better-auth`) replaces it globally.
- `JwtGuard` in `src/modules/auth/infrastructure/guards/jwt.guard.ts`: Replaced by Better-Auth's built-in guard.
- `AuthController` in boilerplate: The `POST /auth/signin` endpoint becomes `POST /api/auth/sign-in/email` via Better-Auth's handler.

---

## Open Questions

1. **Better-Auth vs Custom JWT Token Coexistence**
   - What we know: Better-Auth manages sessions and issues its own session tokens. The mobile clients (React Native) expect Bearer JWT tokens as specified in AUTH-04/AUTH-05.
   - What's unclear: Does Better-Auth's NestJS adapter support serving Bearer JWT tokens alongside its session cookies, or does the system need a hybrid approach where Better-Auth handles authentication and a separate layer issues JWT tokens?
   - Recommendation: Research `AuthService` from `@thallesp/nestjs-better-auth` — it exposes the full Better-Auth API server-side. Better-Auth has a `token` plugin for JWT-style tokens. Alternatively, keep the existing `AuthService.generateAccessToken()` and call it after Better-Auth authentication succeeds. This hybrid pattern is valid.

2. **`npx @better-auth/cli generate` Integration with Existing Entities**
   - What we know: The CLI generates separate entity files in `typeorm/entities/`. The existing `Users` entity at `src/modules/user/core/entities/user.entity.ts` already exists with custom columns.
   - What's unclear: How does `@hedystia/better-auth-typeorm` reconcile Better-Auth's generated `user` entity with the existing custom `Users` entity? Can the adapter use the existing entity instead of the generated one?
   - Recommendation: Pass custom entity classes to the adapter. The adapter supports custom entities via options. Extend the existing `Users` entity to include Better-Auth's required columns (`emailVerified`, `image`, `name`). The planner should treat "aligning Better-Auth schema with existing Users entity" as Wave 1, Task 1.

3. **Optimistic Premium Access Endpoint Design**
   - What we know: CONTEXT decision requires "treat user as premium immediately after redirect." Webhook fires 2-30 seconds later.
   - What's unclear: Should the optimistic activation be a separate endpoint, or should the success URL handler (`GET /subscription/success`) do it?
   - Recommendation: Create `POST /v1/subscriptions/verify-checkout` that accepts `session_id`, calls `stripe.checkout.sessions.retrieve()` to verify payment, upgrades `user.role` to `premium` immediately. The subsequent webhook call updates `subscription` record details; idempotency prevents double-processing.

---

## Sources

### Primary (HIGH confidence)
- `https://www.better-auth.com/docs/integrations/nestjs` — Better-Auth NestJS integration, bodyParser requirement
- `https://www.better-auth.com/docs/authentication/apple` — Apple Sign-In `appBundleIdentifier` requirement
- `https://www.better-auth.com/docs/authentication/google` — Google ID token mobile flow
- `https://www.better-auth.com/docs/authentication/email-password` — sendVerificationEmail, sendResetPassword hooks
- `https://better-auth.com/docs/concepts/users-accounts` — accountLinking, trustedProviders configuration
- `https://better-auth.com/docs/concepts/database` — Better-Auth schema (user, session, account, verification tables)
- `https://github.com/ThallesP/nestjs-better-auth` — Full README: AuthModule.forRoot options, enableRawBodyParser, @Session(), @Roles(), hooks system
- `https://github.com/Zastinian/better-auth-typeorm` — TypeORM adapter setup, CLI generation, DataSource integration
- `https://docs.stripe.com/webhooks/signature` — Stripe webhook signature verification, raw body requirement
- `https://docs.stripe.com/api/checkout/sessions/create` — Checkout session creation, subscription_data.trial_period_days
- `https://docs.stripe.com/api/customer_portal/sessions/create` — Portal session creation
- Codebase inspection of `src/modules/auth/`, `src/modules/user/`, `src/app/app.module.ts`, `src/main.ts`

### Secondary (MEDIUM confidence)
- `https://dev.to/aniefon_umanah_ac5f21311c/building-reliable-stripe-subscriptions-in-nestjs` — Idempotency pattern with webhook_events table, optimistic locking
- `https://manuel-heidrich.dev/blog/how-to-access-the-raw-body-of-a-stripe-webhook-request-in-nestjs/` — NestJS + Stripe raw body approaches
- `https://docs.nestjs.com/security/rate-limiting` — ThrottlerModule configuration, @Throttle() decorator

### Tertiary (LOW confidence)
- Various community articles on NestJS + Stripe integration — cross-verified with official docs
- GitHub issues on Better-Auth account linking behavior (some edge cases flagged as bugs in v2025)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in official docs + codebase package.json
- Architecture: HIGH — based on live codebase inspection; Better-Auth patterns from official docs
- Pitfalls: HIGH for bodyParser/Stripe conflict (verified via official source); MEDIUM for DataSource initialization order (based on TypeScript module loading behavior)
- Open questions: LOW confidence on JWT/session coexistence — needs planner to verify Better-Auth's token plugin capabilities

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (Better-Auth is active development; check for breaking changes after 30 days)

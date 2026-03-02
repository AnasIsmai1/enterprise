# Payments Research: Stripe Subscription Integration for PoshPet

**Domain:** SaaS Subscription Billing (Stripe + NestJS)
**Researched:** 2026-03-02
**Overall confidence:** HIGH (Stripe is a mature, stable API; NestJS patterns are well-established)

---

## 1. Executive Summary

PoshPet needs a straightforward two-tier subscription system: free and premium ($14.99/mo, with $149.99/yr planned for Phase 2). Stripe is the non-negotiable payment processor per the PRD. The integration surface is deliberately small: create customers, start subscriptions via Checkout Sessions, handle lifecycle via webhooks, and gate features via a NestJS guard.

The recommended approach is **Stripe-hosted Checkout + Customer Portal** -- Stripe handles 100% of the payment UI, PCI compliance, and subscription self-service. The backend only needs to (1) create Checkout Sessions, (2) process webhooks, and (3) maintain a local `subscriptions` table that mirrors Stripe state. This is the simplest, most secure, and most maintainable path for a solo founder.

The critical implementation detail is webhook handling. Stripe webhooks are the source of truth for subscription state. The backend must never trust client-side claims about subscription status. Every subscription state change flows through webhooks, gets verified via signature, and updates the local database.

Annual pricing ($149.99/yr) is excluded from Phase 1 per the PRD but the architecture should accommodate it trivially -- it is just a second Stripe Price ID on the same Product.

---

## 2. Stripe SDK Integration with NestJS

### 2.1 Package

Use the official `stripe` npm package directly. There is no official `@nestjs/stripe` package and the community wrappers (`nestjs-stripe`, `@golevelup/nestjs-stripe`) add unnecessary abstraction over what is already a clean SDK. The official SDK is TypeScript-native (zero dependencies), well-typed, and straightforward to wrap in a NestJS provider.

```
npm install stripe
npm install -D @types/express  # already in project
```

**Stripe SDK version:** 20.x (current latest). Uses `stripe` v20+ which has full TypeScript support built-in, ESM + CJS dual publishing, and auto-pagination on list endpoints.

### 2.2 NestJS Provider Pattern

Create a dedicated `StripeModule` that wraps the Stripe client as an injectable provider. This follows the same pattern the project already uses for Redis and Email.

```typescript
// src/external/stripe/stripe.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
```

```typescript
// src/external/stripe/stripe.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService implements OnModuleInit {
  private readonly logger = new Logger(StripeService.name);
  public readonly stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('stripe.secret_key'),
      {
        apiVersion: '2025-12-18.acacia', // pin to a specific API version
        typescript: true,
      },
    );
  }

  onModuleInit() {
    this.logger.log('Stripe SDK initialized');
  }

  // Delegate methods (thin wrappers with logging/error handling)
  // See Section 3 for specific method implementations
}
```

**Key decisions:**
- `@Global()` so every module can inject `StripeService` without importing `StripeModule` everywhere
- Pin the Stripe API version explicitly -- never use the rolling default. This prevents breaking changes from hitting production unexpectedly
- Single Stripe instance shared across the app (the SDK is stateless and thread-safe)

### 2.3 Configuration

Add Stripe config to the existing configuration pattern:

```typescript
// Addition to src/shared/config/configuration.ts
interface StripeConfig {
  secret_key: string;
  webhook_secret: string;
  price_id_monthly: string;
  price_id_yearly?: string; // Phase 2
  customer_portal_url?: string;
}

// In the exported config:
stripe: {
  secret_key: process.env.STRIPE_SECRET_KEY,
  webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  price_id_monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
  price_id_yearly: process.env.STRIPE_PRICE_ID_YEARLY,
},
```

Add to `env.validation.ts`:

```typescript
// Stripe
@IsDefined()
@IsString()
STRIPE_SECRET_KEY: string;

@IsDefined()
@IsString()
STRIPE_WEBHOOK_SECRET: string;

@IsDefined()
@IsString()
STRIPE_PRICE_ID_MONTHLY: string;

@IsOptional()
@IsString()
STRIPE_PRICE_ID_YEARLY: string;
```

### 2.4 Environment Variables

```bash
# .env
STRIPE_SECRET_KEY=sk_test_...              # Test key for development
STRIPE_WEBHOOK_SECRET=whsec_...            # From Stripe CLI or Dashboard
STRIPE_PRICE_ID_MONTHLY=price_...          # Created in Stripe Dashboard
# STRIPE_PRICE_ID_YEARLY=price_...         # Phase 2
```

---

## 3. Core Integration Patterns

### 3.1 Stripe Customer Creation

Create a Stripe Customer when a user registers. Store the `stripe_customer_id` on the user record. This is a one-time operation per user.

**When:** During user registration, after the user record is created in the local DB.

**Why on registration, not on first checkout:** Having a Stripe Customer attached to every user simplifies everything downstream -- checkout, portal, webhook resolution. The Stripe Customer is free (no cost) and the API call takes ~200ms. Doing it lazily (on first checkout) adds branching logic everywhere.

```typescript
// In SubscriptionService or UserService (during registration flow)
async createStripeCustomer(user: Users): Promise<string> {
  const customer = await this.stripeService.stripe.customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    metadata: {
      poshpet_user_id: user.id, // critical for webhook resolution
    },
  });
  return customer.id; // Store this as stripe_customer_id on user entity
}
```

**Important:** The `metadata.poshpet_user_id` field is essential. When webhooks arrive, you resolve the user via `customer` -> lookup user by `stripe_customer_id`. The metadata is a backup/debugging aid.

### 3.2 Checkout Session Creation

Use Stripe Checkout (hosted payment page) rather than building a custom payment form. Stripe Checkout handles:
- Card input with validation
- 3D Secure / SCA authentication
- Apple Pay / Google Pay
- Tax calculation (if enabled)
- Trial period display
- PCI compliance (SAQ A -- the lightest level)

```typescript
// POST /v1/subscriptions/checkout
async createCheckoutSession(userId: string): Promise<{ url: string }> {
  const user = await this.userRepository.findOneOrFail({ where: { id: userId } });

  // Prevent duplicate subscriptions
  const existing = await this.subscriptionRepository.findOne({
    where: { userId, status: In(['active', 'trialing']) },
  });
  if (existing) {
    throw new ConflictException('User already has an active subscription');
  }

  const session = await this.stripeService.stripe.checkout.sessions.create({
    customer: user.stripeCustomerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: this.configService.getOrThrow('stripe.price_id_monthly'),
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 7, // 7-day free trial per PRD
      metadata: {
        poshpet_user_id: userId,
      },
    },
    success_url: `${this.configService.get('app.client_url')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${this.configService.get('app.client_url')}/subscription/cancel`,
    allow_promotion_codes: true, // enable promo codes from day one
  });

  return { url: session.url };
}
```

**Flow:**
1. Client calls `POST /v1/subscriptions/checkout`
2. Backend creates Checkout Session, returns the hosted URL
3. Client redirects user to Stripe-hosted checkout page
4. User completes payment on Stripe's domain
5. Stripe redirects to `success_url`
6. Meanwhile, Stripe fires `checkout.session.completed` webhook
7. Backend processes webhook, creates/updates local subscription record

**For mobile (React Native):** Use Stripe's `@stripe/stripe-react-native` SDK which can open Checkout Sessions in an in-app browser sheet. The backend API is identical -- it returns a `url` that the mobile SDK consumes.

### 3.3 Customer Portal for Self-Service

Stripe Customer Portal handles subscription management UI: cancel, resume, update payment method, switch plans, view invoices. Zero backend code for these flows.

```typescript
// POST /v1/subscriptions/portal
async createPortalSession(userId: string): Promise<{ url: string }> {
  const user = await this.userRepository.findOneOrFail({ where: { id: userId } });

  const session = await this.stripeService.stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${this.configService.get('app.client_url')}/settings/subscription`,
  });

  return { url: session.url };
}
```

**Portal configuration** (done once in Stripe Dashboard or via API):
- Allow cancellation (with cancellation reason survey)
- Allow plan switching (monthly <-> yearly, when Phase 2 adds yearly)
- Allow payment method updates
- Show invoice history
- Branded with PoshPet colors/logo

### 3.4 Subscription Status Endpoint

```typescript
// GET /v1/subscriptions/status
async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusDto> {
  const subscription = await this.subscriptionRepository.findOne({
    where: { userId },
    order: { createdAt: 'DESC' },
  });

  if (!subscription) {
    return {
      tier: 'free',
      status: 'none',
      isPremium: false,
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  return {
    tier: subscription.tier,
    status: subscription.status,
    isPremium: ['active', 'trialing'].includes(subscription.status),
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
}
```

---

## 4. Webhook Handling (Critical Path)

Webhooks are the backbone of the Stripe integration. They are the ONLY reliable way to track subscription state changes. Never rely on Checkout Session completion alone -- use webhooks.

### 4.1 Raw Body Parsing Problem

Stripe webhook signature verification requires the **raw request body** (the exact bytes Stripe sent). NestJS/Express by default parses JSON bodies, which destroys the raw bytes. This is the single most common Stripe + NestJS integration bug.

**Solution:** Configure raw body parsing for the webhook route only.

```typescript
// src/main.ts -- CRITICAL MODIFICATION
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Enable rawBody globally -- NestJS 11 supports this natively
    rawBody: true,
    logger: ['debug', 'log', 'warn'],
    bufferLogs: true,
  });

  // ... rest of bootstrap
}
```

With NestJS 11+ (which this project uses), the `rawBody: true` option on `NestFactory.create` makes `req.rawBody` available on all requests. This is the cleanest approach -- no middleware hacks needed.

**Alternative (if rawBody option is not available):** Use route-specific raw body middleware:

```typescript
// Middleware approach (fallback)
app.use(
  '/api/v1/webhooks/stripe',
  express.raw({ type: 'application/json' }),
);
```

If using this approach, the raw body middleware must be registered BEFORE the global JSON body parser.

### 4.2 Webhook Controller

```typescript
// src/modules/subscription/presentation/controllers/webhook.controller.ts
import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpCode,
  Logger,
  RawBody,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SubscriptionWebhookService } from '../../application/services/subscription-webhook.service';

@Controller({ path: 'webhooks', version: '1' })
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: SubscriptionWebhookService,
  ) {}

  @Post('stripe')
  @HttpCode(200) // Stripe expects 200, not 201
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @RawBody() rawBody: Buffer, // NestJS 11 @RawBody() decorator
  ) {
    if (!signature) {
      this.logger.warn('Webhook received without stripe-signature header');
      return { received: false };
    }

    await this.webhookService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
```

**Key details:**
- No auth guard on the webhook endpoint (Stripe cannot authenticate via JWT)
- Signature verification replaces authentication
- `@HttpCode(200)` -- Stripe treats non-2xx as failure and retries
- Return immediately after queueing work; do heavy processing async
- Use `@RawBody()` decorator (NestJS 11+) to get the raw Buffer

### 4.3 Webhook Service (Event Processing)

```typescript
// src/modules/subscription/application/services/subscription-webhook.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from '@/external/stripe/stripe.service';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionWebhookService {
  private readonly logger = new Logger(SubscriptionWebhookService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    // Step 1: Verify signature (CRITICAL -- never skip this)
    try {
      event = this.stripeService.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.configService.getOrThrow('stripe.webhook_secret'),
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing webhook: ${event.type} [${event.id}]`);

    // Step 2: Idempotency check
    const alreadyProcessed = await this.subscriptionService.isEventProcessed(event.id);
    if (alreadyProcessed) {
      this.logger.log(`Event ${event.id} already processed, skipping`);
      return;
    }

    // Step 3: Route to handler
    try {
      switch (event.type) {
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

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        default:
          this.logger.debug(`Unhandled event type: ${event.type}`);
      }

      // Step 4: Mark event as processed
      await this.subscriptionService.markEventProcessed(event.id, event.type);
    } catch (err) {
      this.logger.error(`Error processing ${event.type}: ${err.message}`, err.stack);
      throw err; // Re-throw so Stripe retries
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const user = await this.subscriptionService.findUserByStripeCustomerId(customerId);
    if (!user) {
      this.logger.error(`No user found for Stripe customer: ${customerId}`);
      return;
    }

    await this.subscriptionService.upsertSubscription({
      userId: user.id,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: subscription.status, // 'trialing' or 'active'
      tier: 'premium',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // Same as created but handles: status changes, plan switches,
    // cancel_at_period_end toggling, trial ending
    await this.subscriptionService.upsertSubscription({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status: subscription.status,
      tier: 'premium', // only one paid tier in Phase 1
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Subscription fully canceled (period ended)
    await this.subscriptionService.upsertSubscription({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status: 'canceled',
      tier: 'free', // Downgrade to free
      cancelAtPeriodEnd: false,
    });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    // Renewal payment succeeded -- subscription continues
    this.logger.log(
      `Payment succeeded for customer ${invoice.customer}, amount: ${invoice.amount_paid}`,
    );
    // The subscription.updated event handles the actual status update
    // This handler is for logging/analytics/sending receipt emails
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    // Payment failed -- Stripe will retry per Smart Retries settings
    const customerId = invoice.customer as string;
    this.logger.warn(`Payment failed for customer ${customerId}`);

    const user = await this.subscriptionService.findUserByStripeCustomerId(customerId);
    if (user) {
      // Send in-app notification about payment failure
      // The subscription status change (to past_due) comes via subscription.updated
      await this.subscriptionService.notifyPaymentFailed(user.id);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    // Checkout completed -- subscription should already be created via
    // customer.subscription.created, but this is a good place to handle
    // any checkout-specific logic (analytics, welcome email, etc.)
    this.logger.log(`Checkout completed: ${session.id}`);
  }
}
```

### 4.4 Required Webhook Events

Configure these events in Stripe Dashboard (or via Stripe CLI for local dev):

| Event | When Fired | Action |
|-------|-----------|--------|
| `customer.subscription.created` | New subscription starts | Create local subscription record |
| `customer.subscription.updated` | Any subscription change (status, plan, trial end, cancellation) | Update local subscription record |
| `customer.subscription.deleted` | Subscription fully terminated | Mark subscription as canceled, downgrade tier |
| `invoice.payment_succeeded` | Successful payment (initial or renewal) | Log for analytics, send receipt notification |
| `invoice.payment_failed` | Payment attempt failed | Notify user, log for monitoring |
| `checkout.session.completed` | User completes Checkout | Analytics, welcome flow trigger |

### 4.5 Idempotency

Stripe may deliver webhooks more than once (network retries, endpoint timeouts). Every webhook handler MUST be idempotent.

**Implementation:** Store processed event IDs in a `stripe_webhook_events` table:

```typescript
// src/modules/subscription/core/entities/stripe-webhook-event.entity.ts
@Entity('stripe_webhook_events')
export class StripeWebhookEvent extends BaseEntity {
  @Column('varchar', { unique: true, length: 255 })
  stripeEventId: string; // e.g., "evt_1234..."

  @Column('varchar', { length: 100 })
  eventType: string; // e.g., "customer.subscription.updated"

  @Column('timestamp with time zone')
  processedAt: Date;
}
```

Check before processing, mark after success. Use a unique constraint on `stripeEventId` as a database-level safety net against race conditions.

### 4.6 Webhook Retry Behavior

Stripe retries failed webhooks with exponential backoff:
- Up to 3 days of retries
- Increasing intervals: 1 hour, 2 hours, 4 hours, etc.
- After all retries exhausted, the event is marked as failed in the Dashboard

**Implication:** Return 200 quickly. If processing takes time, acknowledge the webhook and process asynchronously. For PoshPet's scale, synchronous processing within the request is fine (the operations are simple DB upserts), but design the service layer to be extractable to a queue later.

---

## 5. Subscription State Management

### 5.1 Database Schema

```typescript
// src/modules/subscription/core/entities/subscription.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/domain/base.entity';
import { Users } from '@/modules/user/core/entities/user.entity';

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  PAUSED = 'paused',
}

export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
}

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Users;

  @Index({ unique: true })
  @Column('varchar', { length: 255, nullable: true })
  stripeSubscriptionId: string | null;

  @Index()
  @Column('varchar', { length: 255, nullable: true })
  stripeCustomerId: string | null;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
  })
  tier: SubscriptionTier;

  @Column('timestamp with time zone', { nullable: true })
  currentPeriodStart: Date | null;

  @Column('timestamp with time zone', { nullable: true })
  currentPeriodEnd: Date | null;

  @Column('timestamp with time zone', { nullable: true })
  trialEndsAt: Date | null;

  @Column('boolean', { default: false })
  cancelAtPeriodEnd: boolean;

  @Column('timestamp with time zone', { nullable: true })
  canceledAt: Date | null;
}
```

**Design decisions:**
- One-to-one relationship: each user has at most one subscription record (upsert pattern)
- All Stripe statuses stored directly (do not invent your own status enum)
- `tier` is a derived field for fast lookups; `status` is the Stripe truth
- `cancelAtPeriodEnd` tracks "will cancel at end of period" vs "already canceled"
- UUIDs for primary keys per project convention
- `timestamp with time zone` per project convention

### 5.2 Subscription State Machine

Stripe subscription statuses and their transitions:

```
                        +-> incomplete_expired
                        |
Registration            |
    |                   |
    v                   |
 [no subscription]      |
    |                   |
    | (Checkout)        |
    v                   |
 incomplete --------+---+
    |
    | (payment succeeds)
    v
 trialing (7-day trial)
    |
    | (trial ends, payment succeeds)
    v
 active <----------+
    |               |
    | (payment      | (payment succeeds
    |  fails)       |  after retry)
    v               |
 past_due ----------+
    |
    | (all retries exhausted / user cancels)
    v
 canceled (terminal -- subscription deleted)
    |
    | (user can re-subscribe via new Checkout Session)
    v
 [no subscription] -> back to Checkout flow
```

### 5.3 Premium Access Logic

A user has premium access when their subscription status is `active` OR `trialing`. All other statuses = free tier.

```typescript
// Helper method on SubscriptionService
isPremium(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
    .includes(subscription.status);
}
```

**Grace period consideration:** When a subscription is `past_due`, Stripe is still retrying the payment. The industry-standard approach is to grant a 3-7 day grace period where premium access continues during `past_due`. This prevents churn from temporary card issues.

```typescript
isPremiumWithGracePeriod(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if ([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING].includes(subscription.status)) {
    return true;
  }
  if (subscription.status === SubscriptionStatus.PAST_DUE) {
    // Grant 7-day grace period from when payment first failed
    const gracePeriodDays = 7;
    const gracePeriodEnd = new Date(subscription.currentPeriodEnd);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);
    return new Date() < gracePeriodEnd;
  }
  return false;
}
```

### 5.4 Dunning (Failed Payment Handling)

Stripe's **Smart Retries** handle retry logic automatically. Configure in Stripe Dashboard under Billing > Settings > Smart Retries:

- **Retry schedule:** Stripe's ML-optimized retry timing (recommended), or manual schedule
- **Number of retries:** 3-4 retries over 3-4 weeks
- **After final retry fails:** Mark subscription as `canceled` (recommended) or `unpaid`
- **Customer emails:** Enable Stripe's built-in dunning emails (failed payment, upcoming expiration)

**What the backend needs to do:**
1. Track `past_due` status via webhooks (already handled by `subscription.updated`)
2. Show in-app banner when subscription is `past_due` ("Update your payment method")
3. Send push notification on first payment failure
4. Stripe handles the rest (retry timing, dunning emails, eventual cancellation)

### 5.5 Price Switching (Monthly to Yearly)

Not in Phase 1 scope, but the architecture supports it trivially:

```typescript
// Phase 2: Switch plan via Customer Portal (zero backend code)
// OR via API:
async switchPlan(subscriptionId: string, newPriceId: string) {
  const subscription = await this.stripeService.stripe.subscriptions.retrieve(subscriptionId);
  await this.stripeService.stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations', // Stripe calculates credit/charge
  });
  // Webhook handles the rest
}
```

Proration is automatic -- Stripe credits unused time on the old plan and charges the new plan.

---

## 6. Premium Feature Gating

### 6.1 NestJS Guard Pattern

Create a `PremiumGuard` that checks subscription status. This follows the same pattern as the existing `JwtGuard` and `CaslGuard` in the project.

```typescript
// src/modules/subscription/infrastructure/guards/premium.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../../application/services/subscription.service';

export const PREMIUM_KEY = 'requiresPremium';

@Injectable()
export class PremiumGuard implements CanActivate {
  private readonly logger = new Logger(PremiumGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as premium-only
    const requiresPremium = this.reflector.getAllAndOverride<boolean>(PREMIUM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresPremium) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id; // Set by JwtGuard

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const isPremium = await this.subscriptionService.isUserPremium(userId);
    if (!isPremium) {
      throw new ForbiddenException({
        code: 'PREMIUM_REQUIRED',
        message: 'This feature requires a PoshPet Society subscription',
        upgradeUrl: '/v1/subscriptions/checkout',
      });
    }

    return true;
  }
}
```

### 6.2 Premium Decorator

```typescript
// src/modules/subscription/infrastructure/decorators/premium.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { PREMIUM_KEY } from '../guards/premium.guard';

export const RequiresPremium = () => SetMetadata(PREMIUM_KEY, true);
```

### 6.3 Usage on Controllers

```typescript
// Example: Care Circles (premium-only per PRD)
@Controller({ path: 'circles', version: '1' })
@UseGuards(JwtGuard) // authentication first
export class CareCircleController {

  @Post()
  @RequiresPremium() // premium check
  @UseGuards(PremiumGuard)
  async createCircle(@CurrentUser() user, @Body() dto: CreateCircleDto) {
    // Only premium users can CREATE circles
  }

  @Get(':id')
  // No @RequiresPremium -- free users can VIEW circles they were invited to
  async getCircle(@Param('id') id: string) {
    // Available to all users
  }
}
```

### 6.4 Limit-Based Gating (Not Just Binary)

Some features are not binary premium/free but have tiered limits (photos: 3/day free vs unlimited premium, custom trackers: 3 free vs unlimited premium). Handle these in the service layer, not guards:

```typescript
// In PhotoService
async uploadPhoto(userId: string, petId: string, file: Express.Multer.File) {
  const isPremium = await this.subscriptionService.isUserPremium(userId);

  if (!isPremium) {
    const todayCount = await this.photoRepository.count({
      where: {
        userId,
        createdAt: MoreThanOrEqual(startOfDay(new Date())),
      },
    });

    if (todayCount >= 3) {
      throw new ForbiddenException({
        code: 'PHOTO_LIMIT_REACHED',
        message: 'Free tier allows 3 photos per day. Upgrade to PoshPet Society for unlimited.',
        currentCount: todayCount,
        limit: 3,
        upgradeUrl: '/v1/subscriptions/checkout',
      });
    }
  }

  // Proceed with upload...
}
```

### 6.5 Caching Subscription Status

Checking the database on every request is unnecessary. Cache the premium status in Redis:

```typescript
// In SubscriptionService
async isUserPremium(userId: string): Promise<boolean> {
  // Check Redis first (TTL: 5 minutes)
  const cacheKey = `sub:premium:${userId}`;
  const cached = await this.redis.get(cacheKey);
  if (cached !== null) return cached === '1';

  // Cache miss: check database
  const subscription = await this.subscriptionRepository.findOne({
    where: { userId },
  });
  const isPremium = this.isPremiumWithGracePeriod(subscription);

  // Cache the result
  await this.redis.set(cacheKey, isPremium ? '1' : '0', 'EX', 300); // 5 min TTL

  return isPremium;
}

// CRITICAL: Invalidate cache when subscription changes (in webhook handler)
async invalidateSubscriptionCache(userId: string): Promise<void> {
  await this.redis.del(`sub:premium:${userId}`);
}
```

**TTL of 5 minutes** is the sweet spot: short enough that downgrades take effect reasonably quickly, long enough to avoid hammering the DB on every API call.

---

## 7. Module Structure

Following the project's existing architecture pattern (presentation/application/infrastructure/core):

```
src/modules/subscription/
  core/
    entities/
      subscription.entity.ts
      stripe-webhook-event.entity.ts
    interfaces/
      repositories/
        subscription.repository.interface.ts
  application/
    dtos/
      checkout-session.dto.ts
      subscription-status.dto.ts
    services/
      subscription.service.ts
      subscription-webhook.service.ts
  infrastructure/
    repositories/
      subscription.repository.ts
    guards/
      premium.guard.ts
    decorators/
      premium.decorator.ts
  presentation/
    controllers/
      subscription.controller.ts    # Checkout, portal, status
      webhook.controller.ts          # Stripe webhook endpoint
    subscription.module.ts

src/external/stripe/
  stripe.module.ts
  stripe.service.ts
```

---

## 8. Testing Strategy

### 8.1 Local Development with Stripe CLI

The Stripe CLI forwards webhooks to your local server:

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Linux: see https://docs.stripe.com/stripe-cli

# Login
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:5500/api/v1/webhooks/stripe

# The CLI outputs a webhook signing secret (whsec_...) -- use this as
# STRIPE_WEBHOOK_SECRET in your .env for local development

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

### 8.2 Unit Tests

Mock the Stripe SDK at the service boundary. Never call Stripe in unit tests.

```typescript
// subscription-webhook.service.spec.ts
describe('SubscriptionWebhookService', () => {
  let service: SubscriptionWebhookService;
  let stripeService: jest.Mocked<StripeService>;
  let subscriptionService: jest.Mocked<SubscriptionService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SubscriptionWebhookService,
        {
          provide: StripeService,
          useValue: {
            stripe: {
              webhooks: {
                constructEvent: jest.fn(),
              },
            },
          },
        },
        {
          provide: SubscriptionService,
          useValue: {
            isEventProcessed: jest.fn().mockResolvedValue(false),
            markEventProcessed: jest.fn(),
            upsertSubscription: jest.fn(),
            findUserByStripeCustomerId: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('whsec_test'),
          },
        },
      ],
    }).compile();

    service = module.get(SubscriptionWebhookService);
    // ... test subscription created, updated, deleted events
  });

  it('should reject events with invalid signatures', async () => {
    stripeService.stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await expect(
      service.handleWebhook(Buffer.from('{}'), 'bad_sig'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should skip already processed events (idempotency)', async () => {
    subscriptionService.isEventProcessed.mockResolvedValue(true);
    stripeService.stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    await service.handleWebhook(Buffer.from('{}'), 'valid_sig');

    expect(subscriptionService.upsertSubscription).not.toHaveBeenCalled();
  });
});
```

### 8.3 Integration Tests (E2E)

Use Stripe test mode with test API keys. Create real Stripe test objects:

```typescript
// test/subscription.e2e-spec.ts
describe('Subscription (e2e)', () => {
  it('should create checkout session for authenticated user', () => {
    return request(app.getHttpServer())
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200) // or 201
      .expect((res) => {
        expect(res.body.data.url).toContain('checkout.stripe.com');
      });
  });

  it('should return free tier for user without subscription', () => {
    return request(app.getHttpServer())
      .get('/api/v1/subscriptions/status')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.tier).toBe('free');
        expect(res.body.data.isPremium).toBe(false);
      });
  });

  it('should reject webhook with invalid signature', () => {
    return request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .set('stripe-signature', 'invalid')
      .send({ type: 'customer.subscription.created' })
      .expect(400);
  });
});
```

### 8.4 Stripe Test Clocks

For testing subscription lifecycle (trial expiration, renewals, cancellation) without waiting real time, use Stripe Test Clocks:

```typescript
// Create a test clock in Stripe Dashboard or via API
const testClock = await stripe.testHelpers.testClocks.create({
  frozen_time: Math.floor(Date.now() / 1000),
});

// Create customer attached to test clock
const customer = await stripe.customers.create({
  test_clock: testClock.id,
  email: 'test@example.com',
});

// Advance time to simulate trial ending
await stripe.testHelpers.testClocks.advance(testClock.id, {
  frozen_time: Math.floor(Date.now() / 1000) + 8 * 24 * 60 * 60, // 8 days later
});
```

Test Clocks are only available in test mode and are invaluable for testing the full subscription lifecycle.

---

## 9. Security

### 9.1 PCI Compliance

Using Stripe Checkout (hosted payment page) puts PoshPet at **PCI SAQ A** -- the lightest compliance level. Card numbers never touch PoshPet's servers. No PCI self-assessment questionnaire is required for SAQ A if using only Stripe Checkout or Stripe Elements.

**Do NOT:**
- Collect card numbers on your own forms
- Log or store any part of card numbers
- Proxy card data through your servers

### 9.2 Webhook Endpoint Security

1. **Signature verification** (implemented above) -- verifies the webhook came from Stripe
2. **No auth guard** on the webhook endpoint -- Stripe cannot authenticate via JWT
3. **HTTPS only** in production -- Stripe will not send webhooks to HTTP endpoints
4. **No rate limiting** on the webhook endpoint (per PRD) -- Stripe self-limits and signature verification prevents abuse
5. **Idempotency** (implemented above) -- prevents replay attacks and duplicate processing

### 9.3 Preventing Subscription Bypass

1. **Server-side gating only** -- never trust the client about premium status. The `PremiumGuard` checks the database, not a JWT claim or client header.
2. **Webhook as source of truth** -- subscription status updates come only from Stripe webhooks, not from client-side Checkout completion callbacks.
3. **Do NOT store subscription status in JWT** -- JWTs are long-lived (15 min) and cannot be revoked. If a user's subscription is canceled, the JWT would still claim premium for up to 15 minutes. Always check the database (with Redis cache).
4. **Redis cache invalidation on every webhook** -- when subscription state changes, the cache is busted immediately.

### 9.4 Stripe Secret Key Protection

- Store `STRIPE_SECRET_KEY` only in environment variables, never in code
- Use test keys (`sk_test_`) in development, live keys (`sk_live_`) only in production
- Rotate keys immediately if exposed
- Use restricted API keys in production with only necessary permissions:
  - Customers: Write
  - Subscriptions: Write
  - Checkout Sessions: Write
  - Billing Portal: Write
  - Webhook Endpoints: Read

---

## 10. Apple/Google IAP Considerations

The PRD mentions App Store compliance and the mobile app is React Native. There is a critical consideration here:

**Apple requires in-app purchases (IAP) for digital subscriptions sold within iOS apps.** You cannot link to a web checkout from within an iOS app (Apple takes a 15-30% commission on IAP). Google Play has similar requirements but is slightly more lenient.

**Options for PoshPet Phase 1:**

1. **Web-first subscription flow:** Users subscribe via the web app (Stripe Checkout), then use the subscription across mobile and web. The mobile app shows subscription status but does not offer an in-app purchase button. This is technically allowed but limits conversion (users must leave the app to subscribe). Apple has recently relaxed rules for "reader" apps but this is still a gray area for non-reader apps.

2. **Dual billing (Phase 2):** Implement Apple IAP + Google Play Billing alongside Stripe. This is the "correct" long-term approach but adds massive complexity: separate receipt validation, two billing systems to reconcile, Apple's 15-30% commission, etc.

3. **External link entitlement (StoreKit 2):** Apple now allows some apps to link to external purchase pages under specific conditions (US-only for now, requires entitlement approval). This may apply to PoshPet.

**Recommendation for Phase 1:** Implement Stripe-only and launch the web app first. Add Apple IAP/Google Play Billing in Phase 2 when mobile launch is imminent. The backend subscription architecture described here (webhook-driven, status in DB) works identically regardless of payment source -- you just add more webhook handlers for Apple/Google receipts later.

**Important note:** This is a business decision, not a technical one. Consult Apple's current App Store Review Guidelines (specifically 3.1.1 - In-App Purchase) before submitting the iOS app. LOW confidence on the exact current Apple policy -- this needs validation before mobile launch.

---

## 11. Stripe Dashboard Setup Checklist

Before any code works, configure these in the Stripe Dashboard:

1. **Create a Product** called "PoshPet Society"
2. **Create a Price** on that Product: $14.99/month, recurring
3. (Phase 2) Create a second Price: $149.99/year, recurring
4. **Configure Customer Portal** (Billing > Customer Portal):
   - Enable cancellation
   - Enable payment method updates
   - Enable invoice history
   - Add PoshPet branding (logo, colors)
5. **Configure Webhook Endpoint** (Developers > Webhooks):
   - URL: `https://api.poshpet.com/api/v1/webhooks/stripe`
   - Events: the 6 events listed in Section 4.4
   - Copy the signing secret to `STRIPE_WEBHOOK_SECRET`
6. **Configure Smart Retries** (Billing > Settings):
   - Enable Smart Retries (Stripe ML-based retry timing)
   - Failed payment emails: enabled
   - Number of retries: 4
   - After final failure: cancel subscription
7. **Configure trial settings:**
   - Trial via Checkout Session (7 days, set in code)
   - No card required for trial: NO (require card upfront -- reduces fraud)
8. **Test mode first** -- all of the above in test mode, then replicate in live mode before launch

---

## 12. Complete API Surface

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/v1/subscriptions/checkout` | JWT | Create Stripe Checkout Session, return URL |
| `POST` | `/v1/subscriptions/portal` | JWT | Create Customer Portal session, return URL |
| `GET` | `/v1/subscriptions/status` | JWT | Get current subscription status |
| `POST` | `/v1/webhooks/stripe` | Stripe Signature | Handle Stripe webhook events |

That is the entire API surface for payments. Four endpoints. The simplicity is intentional -- Stripe Checkout and Customer Portal handle all the complex UI flows.

---

## 13. Implementation Order

For a solo developer, build the payments module in this order:

1. **StripeModule + StripeService** (external provider, ~30 min)
2. **Subscription entity + migration** (database schema, ~30 min)
3. **Stripe Customer creation** (hook into user registration, ~1 hour)
4. **Webhook controller + raw body setup** (the hardest part, ~2 hours)
5. **Webhook service** (event handlers, ~2 hours)
6. **Checkout Session endpoint** (~1 hour)
7. **Customer Portal endpoint** (~30 min)
8. **Subscription status endpoint** (~30 min)
9. **PremiumGuard + decorator** (~1 hour)
10. **Redis caching for subscription status** (~1 hour)
11. **Integration tests** (~2 hours)
12. **Stripe Dashboard configuration** (~1 hour)

**Total estimated effort:** ~12-14 hours for a complete, tested, production-ready Stripe subscription system.

---

## 14. Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stripe SDK integration pattern | HIGH | Standard pattern, well-documented by Stripe, used in thousands of NestJS projects |
| Webhook handling + raw body | HIGH | Known issue with well-documented solution. NestJS 11 `rawBody` option is the cleanest fix |
| Subscription state machine | HIGH | Stripe subscription statuses are well-documented and stable |
| PremiumGuard pattern | HIGH | Standard NestJS guard pattern, consistent with project's existing guard architecture |
| Apple IAP requirements | LOW | Apple's policies change frequently; needs validation before iOS submission |
| Stripe SDK v20 specific APIs | MEDIUM | Based on training data; `apiVersion` string and some SDK method signatures should be verified against `npm info stripe` or Stripe docs at implementation time |

---

## 15. Gaps and Open Questions

1. **Apple IAP / Google Play Billing:** Will the iOS app need in-app purchases? This is a business/legal question that significantly impacts architecture if "yes." Research this before mobile app submission.

2. **Stripe API version string:** The exact API version string (`2025-12-18.acacia`) used in the code examples is illustrative. At implementation time, check `stripe version` in the Stripe Dashboard for the current stable API version to pin.

3. **Tax collection:** Stripe Tax can automatically calculate and collect sales tax/VAT. Not mentioned in the PRD. Worth enabling from day one if selling in the US (some states require sales tax on digital subscriptions). This is a Stripe Dashboard toggle + one line of code in the Checkout Session.

4. **Subscription analytics:** The PRD mentions an admin panel with business metrics. Consider storing subscription lifecycle events (created, trial started, converted, churned) in an analytics table for the admin dashboard, beyond what Stripe Dashboard provides.

5. **Multi-device session handling:** When a user upgrades to premium on one device, other logged-in devices need to reflect this. The Redis cache invalidation on webhook handles this (cache miss -> fresh DB read), but consider a WebSocket push for instant UI updates on all devices.

---

## 16. Sources and References

- Stripe Billing documentation: https://docs.stripe.com/billing
- Stripe Checkout integration: https://docs.stripe.com/payments/checkout
- Stripe Customer Portal: https://docs.stripe.com/customer-management/portal-deep-dive
- Stripe Webhooks: https://docs.stripe.com/webhooks
- Stripe Webhook best practices: https://docs.stripe.com/webhooks/best-practices
- Stripe Test Clocks: https://docs.stripe.com/billing/testing/test-clocks
- Stripe CLI: https://docs.stripe.com/stripe-cli
- NestJS raw body access: https://docs.nestjs.com/faq/raw-body
- Apple App Store Review Guidelines 3.1.1: https://developer.apple.com/app-store/review/guidelines/#in-app-purchase
- Stripe npm package: https://www.npmjs.com/package/stripe (v20.4.0 current)

**Note on source limitations:** WebSearch and WebFetch were unavailable during this research. All Stripe patterns documented here are based on Stripe's well-established, stable APIs that have been consistent for years. The core patterns (Checkout Sessions, Customer Portal, webhook signature verification) have not materially changed since Stripe Billing v2 (2020+). Specific API version strings and minor SDK method signatures should be verified against current Stripe documentation at implementation time.

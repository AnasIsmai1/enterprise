# Roadmap: PoshPet Backend API

## Overview

PoshPet's backend delivers a luxury pet care planner API across 7 phases, progressing from infrastructure foundation through the core daily care loop, data/media features, social features, the complex Party Kits celebration system, and finally admin/compliance for launch readiness. Each phase delivers independently testable capability. The boilerplate cleanup, cross-cutting concerns (API conventions, security, file storage, email), and database foundation come first because every feature module depends on them. Auth and payments follow immediately because every subsequent feature needs user identity, pet ownership, and premium-tier gating. From there, features build upward: daily care engine, health/media/timeline, social circles, celebrations, and admin tooling.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Infrastructure** - Boilerplate cleanup, DB setup, API conventions, security baseline, file storage, email service (completed 2026-03-02)
- [ ] **Phase 2: Identity & Payments** - Better-Auth integration, user accounts, pet CRUD, Stripe subscriptions
- [ ] **Phase 3: Daily Care Engine** - Task planner, Care Garden, streaks/badges, avatar mood, daily cron jobs
- [ ] **Phase 4: Pet Data & Media** - Health tracking, custom trackers, photo gallery, timeline, memorial mode
- [ ] **Phase 5: Social & Notifications** - Care Circles, content moderation, push notifications, notification cron jobs
- [ ] **Phase 6: Celebrations & Capsules** - Party Kits, Time Capsules, Memory Pages, AI pacing engine
- [ ] **Phase 7: Admin & Launch Readiness** - Admin panel API, GDPR/CCPA compliance, analytics, backup verification

## Phase Details

### Phase 1: Foundation & Infrastructure
**Goal**: The NestJS project is cleaned up, properly configured, and has all cross-cutting concerns in place so that feature modules can be built on a solid, consistent foundation
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09, API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, API-10, API-11, API-12, API-13, API-14, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11, SEC-12, SEC-13, SEC-14, FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, FILE-06, FILE-07, FILE-08, FILE-09, FILE-10, EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06
**Success Criteria** (what must be TRUE):
  1. Docker Compose starts PostgreSQL 16 and Redis 7, the NestJS app boots and connects to both, and the health check endpoint returns OK
  2. The boilerplate's CASL authorization, organization entities, and broken base.entity.ts timestamps are removed/fixed, replaced with simple role enum and correct @CreateDateColumn/@UpdateDateColumn
  3. A test API request demonstrates the full request/response lifecycle: validation (class-validator), standardized success/error response format, pagination meta, rate limiting headers, and Swagger documentation
  4. File upload to Cloudflare R2 works for all 3 buckets (media, capsules, static) with signed URL generation and correct directory structure
  5. Brevo transactional email sends successfully for verification, password reset, and alert templates, with Sentry capturing 5xx errors and sending admin alert emails on critical failures
**Plans**: TBD

Plans:
- [ ] 01-01: Boilerplate cleanup and database foundation
- [ ] 01-02: API conventions, security middleware, and error handling
- [ ] 01-03: File storage (R2) and email service (Brevo)

### Phase 2: Identity & Payments
**Goal**: Users can register, authenticate, manage their accounts, create and manage pets, and subscribe to premium -- the complete identity and payment foundation that all features depend on
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, AUTH-11, AUTH-12, AUTH-13, AUTH-14, USER-01, USER-02, USER-03, USER-04, USER-05, USER-06, PET-01, PET-02, PET-03, PET-04, PET-05, PET-06, PET-07, SUB-01, SUB-02, SUB-03, SUB-04, SUB-05, SUB-06, SUB-07, SUB-08, SUB-09, SUB-10, SUB-11, SUB-12, SUB-13, SUB-14
**Success Criteria** (what must be TRUE):
  1. A user can register with email/password, receive a verification email, verify their account, log in, and receive JWT access (15-min) and refresh (7-day) tokens -- and can also sign in via Apple or Google ID tokens
  2. A logged-in user can create a pet (with species from the 14 supported), view their pets, switch active pet context, edit pet details, and soft-delete a pet with 90-day recovery -- with free users limited to 1 pet
  3. A user can initiate Stripe Checkout to subscribe (monthly or annual), manage their subscription via Stripe Customer Portal, and the system correctly processes all 6 webhook events (created, updated, deleted, payment failed/succeeded, checkout completed) to update subscription status
  4. On premium downgrade, second+ pets become view-only, premium features are locked, but all user data is preserved
  5. Account deletion with "type DELETE" confirmation initiates a 14-day grace period, and the @RequiresPremium() decorator correctly gates premium-only endpoints while @Roles() guards enforce role-based access
**Plans**: TBD

Plans:
- [ ] 02-01: Better-Auth integration and authentication flows
- [ ] 02-02: User accounts, pet CRUD, and role guards
- [ ] 02-03: Stripe subscriptions and webhook handling

### Phase 3: Daily Care Engine
**Goal**: The core daily loop works end-to-end: task templates generate daily instances, completing tasks updates the Care Garden, maintains streaks, awards badges, and recalculates the pet's avatar mood
**Depends on**: Phase 2
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, PLAN-07, PLAN-08, PLAN-09, GARDEN-01, GARDEN-02, GARDEN-03, GARDEN-04, GARDEN-05, GARDEN-06, GARDEN-07, GARDEN-08, GARDEN-09, STREAK-01, STREAK-02, STREAK-03, STREAK-04, STREAK-05, STREAK-06, AVATAR-01, AVATAR-02, AVATAR-03, AVATAR-04, CRON-02, CRON-04, CRON-05
**Success Criteria** (what must be TRUE):
  1. A user can create task templates with daily/weekly/custom frequency, and the task_instance_generation cron job (12:02 AM per timezone) creates today's task instances from those templates, with default species-specific templates seeded for all 14 species
  2. Completing a task instance updates the Care Garden's daily completion count, Full Bloom is detected when all tasks are done, garden history is viewable for past days, and garden state is cached in Redis
  3. Per-task streaks increment on completion, persist across days, support skip functionality (max 3 consecutive), and award 6-tier badges (7d through 365d) -- with streak data cached in Redis and the streak_reset_check cron (12:05 AM per timezone) resetting broken streaks
  4. The avatar mood recalculates on task completion events using the priority-based algorithm (sleeping > sad > waiting > happy) with Redis caching
  5. Planner preferences (theme, visibility, module show/hide) are configurable, with preset themes gated to premium users
**Plans**: TBD

Plans:
- [ ] 03-01: Task planner (templates, instances, cron, preferences)
- [ ] 03-02: Care Garden, streaks, badges, and avatar mood

### Phase 4: Pet Data & Media
**Goal**: Users can track their pet's health, upload photos, maintain a chronological timeline of their pet's life, and memorialize pets that have passed away
**Depends on**: Phase 3
**Requirements**: HEALTH-01, HEALTH-02, HEALTH-03, HEALTH-04, HEALTH-05, HEALTH-06, HEALTH-07, HEALTH-08, HEALTH-09, HEALTH-10, HEALTH-11, TRACK-01, TRACK-02, TRACK-03, TRACK-04, PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04, PHOTO-05, PHOTO-06, PHOTO-07, TIMELINE-01, TIMELINE-02, TIMELINE-03, TIMELINE-04, TIMELINE-05, TIMELINE-06, MEMORIAL-01, MEMORIAL-02, MEMORIAL-03, MEMORIAL-04, MEMORIAL-05, MEMORIAL-06, CRON-09
**Success Criteria** (what must be TRUE):
  1. A user can log pet weight entries and see trend calculations (up/down/stable), record vet visits with file attachments, and track medications with individual dose administration logs -- with all 4 medical disclaimers served via API and first-time acknowledgment tracked
  2. A user can create custom trackers from 10 pre-made templates or from scratch (3 free, unlimited premium) and log entries against them
  3. Photo uploads go through the Sharp 3-size processing pipeline (thumbnail/medium/original) via BullMQ async jobs, EXIF data is stripped, daily upload limits are enforced (3 free, unlimited premium), and the photo_cleanup cron handles orphaned files
  4. The Pet Legacy Timeline auto-generates entries from app activity (task completions, photos, milestones, health events) and supports manual entries, category filtering, and chronological viewing
  5. A user can mark a pet as passed away to activate Memorial Mode, which stops all reminders/notifications for that pet and enables PDF export of the pet's timeline via PDFKit
**Plans**: TBD

Plans:
- [ ] 04-01: Health tracking (weight, vet visits, medications, disclaimers)
- [ ] 04-02: Custom trackers and photo gallery pipeline
- [ ] 04-03: Pet Legacy Timeline and Memorial Mode

### Phase 5: Social & Notifications
**Goal**: Users can form private Care Circles to share their pet care journey, content is moderated for safety, and users receive intelligent push notifications with bundling and quiet hours
**Depends on**: Phase 4
**Requirements**: CIRCLE-01, CIRCLE-02, CIRCLE-03, CIRCLE-04, CIRCLE-05, CIRCLE-06, CIRCLE-07, CIRCLE-08, CIRCLE-09, CIRCLE-10, MOD-01, MOD-02, MOD-03, MOD-04, MOD-05, MOD-06, NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06, NOTIF-07, CRON-06, CRON-08
**Success Criteria** (what must be TRUE):
  1. A user can create a Care Circle (5-20 members), invite others via links or QR codes, and members can create posts, comment, and react within the circle
  2. Content reporting works end-to-end: users can report content, NSFW image detection flags uploads, keyword filtering catches prohibited text, and reported content enters the moderation queue with escalation rules (warning, suspension, ban)
  3. Users can register device tokens for FCM push notifications, configure per-category notification preferences, set quiet hours, and the notification_digest cron bundles 3+ notifications within 30 minutes into a digest
  4. The expired_invite_cleanup cron removes expired circle invites (7-day) and QR codes (24-hour) automatically
**Plans**: TBD

Plans:
- [ ] 05-01: Care Circles (entities, membership, posts, invites)
- [ ] 05-02: Content moderation and notification system

### Phase 6: Celebrations & Capsules
**Goal**: Users can experience guided Party Kit celebrations with encrypted Time Capsules, Living Memory Pages, and intelligent pacing -- the premium emotional centerpiece of the app
**Depends on**: Phase 5
**Requirements**: KIT-01, KIT-02, KIT-03, KIT-04, KIT-05, KIT-06, KIT-07, KIT-08, KIT-09, KIT-10, KIT-11, KIT-12, CAPSULE-01, CAPSULE-02, CAPSULE-03, CAPSULE-04, CAPSULE-05, CAPSULE-06, CAPSULE-07, CAPSULE-08, CAPSULE-09, MEMORY-01, MEMORY-02, MEMORY-03, MEMORY-04, MEMORY-05, AI-01, AI-02, AI-03, AI-04, CRON-01, CRON-07
**Success Criteria** (what must be TRUE):
  1. All 4 Party Kit templates (Birthday, Adoption Anniversary, New Pet Welcome, Senior Pet Comfort) are seeded with complete steps, and a user can start a kit, progress through steps with type-specific validation for all 8 step types, and reach cinematic completion -- with free users limited to a subset of steps
  2. Time Capsules use AES-256-GCM encryption with per-capsule keys derived from CAPSULE_ENCRYPTION_MASTER_KEY, capsule media is stored in the separate poshpet-capsules bucket, signed URLs are only generated after delivery date verification, and the time_capsule_delivery cron delivers capsules daily at 9 AM UTC
  3. Memory Pages are generated from kit activity, support year-over-year navigation and export (share image, PDF), and Care Circle members can contribute to kits via the contributor invitation flow with deadline
  4. The rules-based AI engine optimizes notification timing and adapts kit pacing based on user behavior, with the kit_pacing_check cron prompting users for next steps daily at 10 AM UTC
  5. The Legacy Celebration Archive stores completed kits and transforms them for memorial mode when a pet passes away
**Plans**: TBD

Plans:
- [ ] 06-01: Party Kit framework (templates, steps, progress, validation)
- [ ] 06-02: Time Capsules (encryption, seal/deliver, cron)
- [ ] 06-03: Memory Pages, circle contributions, and AI pacing engine

### Phase 7: Admin & Launch Readiness
**Goal**: The solo founder has full admin tooling to manage users, moderate content, and view analytics, and the system meets GDPR/CCPA compliance requirements for launch
**Depends on**: Phase 6
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08, COMP-09, COMP-10, CRON-03, CRON-10
**Success Criteria** (what must be TRUE):
  1. The admin can search/view/suspend/ban users, view and manually override subscription statuses, and manage Party Kit templates (CRUD, toggle active, preview) -- all behind 2FA-protected superadmin access
  2. The GDPR compliance endpoints work: "Download My Data" returns JSON/ZIP of all user data, account deletion completes within 30 days, data portability exports machine-readable JSON, account freeze works within 72 hours, analytics opt-out is immediate, and anonymized aggregate analytics are retained after deletion
  3. CCPA "Do Not Sell My Personal Information" endpoint is functional, medical disclaimers are served via API, and the privacy contact email is configured
  4. The admin analytics dashboard shows DAU, task completions, Full Blooms, kit starts/completion funnels, and capsule seal rates -- with the analytics_snapshot cron capturing daily metrics and backup_verification cron alerting if backups are older than 48 hours
**Plans**: TBD

Plans:
- [ ] 07-01: Admin panel API (users, subscriptions, kits, moderation)
- [ ] 07-02: GDPR/CCPA compliance and analytics

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Infrastructure | 3/3 | Complete   | 2026-03-02 |
| 2. Identity & Payments | 0/3 | Not started | - |
| 3. Daily Care Engine | 0/2 | Not started | - |
| 4. Pet Data & Media | 0/3 | Not started | - |
| 5. Social & Notifications | 0/2 | Not started | - |
| 6. Celebrations & Capsules | 0/3 | Not started | - |
| 7. Admin & Launch Readiness | 0/2 | Not started | - |

# PoshPet Backend — Requirements

> Extracted from the 123-page Phase 1 Technical Documentation (POSHPET.pdf).
> Scope: Backend API only (NestJS + TypeORM + PostgreSQL + Redis).
> Stack decisions documented in PROJECT.md take precedence over PDF defaults.

---

## Category: AUTH — Authentication & Authorization

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| AUTH-01 | Email/password registration with email verification | All | 6.8.2 |
| AUTH-02 | Apple Sign-In (mobile ID token verification) | All | 6.6.1 |
| AUTH-03 | Google Sign-In (mobile ID token verification) | All | 5.12 |
| AUTH-04 | JWT access tokens (15-minute expiry) | All | 6.8.2 |
| AUTH-05 | JWT refresh tokens (7-day expiry, single-use, rotated on refresh) | All | 6.8.2 |
| AUTH-06 | Refresh token stored in Redis (not DB) | All | 7.1 |
| AUTH-07 | Password reset via email link | All | 6.8.2 |
| AUTH-08 | Role-based access: free, premium, superadmin | All | 7.4.2 |
| AUTH-09 | PremiumGuard / @RequiresPremium() decorator for premium features | Premium | 7.7.2 |
| AUTH-10 | Admin JWT contains 'superadmin' claim | Admin | 7.4.2 |
| AUTH-11 | Login rate limiting: 5 failures per 15 min per IP, then 30-min lockout | All | 6.8.2 |
| AUTH-12 | Better-Auth integration with NestJS adapter (@thallesp/nestjs-better-auth) | All | PROJECT.md |
| AUTH-13 | TypeORM adapter for Better-Auth (@hedystia/better-auth-typeorm) | All | PROJECT.md |
| AUTH-14 | 2FA required for admin panel access | Admin | 6.8.2 |

## Category: USER — User Account Management

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| USER-01 | User profile: name, email, avatar URL, timezone, created_at | All | 7.2 |
| USER-02 | Account deletion with 14-day grace period (type 'DELETE' confirmation) | All | 6.4.2 |
| USER-03 | All personal data permanently deleted within 30 days of deletion request | All | 6.3.3 |
| USER-04 | Health disclaimer acknowledgment tracking (boolean + timestamp on user record) | All | 6.1.2 |
| USER-05 | User can edit name, email, pet info directly in app | All | 6.4.2 |
| USER-06 | Age requirement: 13+ (COPPA), 16+ for EU (GDPR) | All | 6.2.2 |

## Category: PET — Pet Management

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| PET-01 | Pet CRUD: name, species, breed, birthday, avatar photo | All | 5.12 |
| PET-02 | 14 species supported | All | Doc 1 |
| PET-03 | 1 free pet, unlimited pets for premium | Free/Premium | 5.12 |
| PET-04 | Pet selector / multi-pet switching context | All | 5.12 |
| PET-05 | Soft-delete pets with 90-day recovery period | All | 6.3.3 |
| PET-06 | On premium downgrade: second+ pets become view-only | Premium | 6.2.5 |
| PET-07 | 7 CRUD endpoints for pets | All | 5.12 |

## Category: SUB — Subscription & Payments

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| SUB-01 | Stripe integration for subscription management | Premium | 7.1 |
| SUB-02 | Two price tiers: $14.99/month, $149.99/year | Premium | 6.2.5 |
| SUB-03 | Stripe Checkout for subscription creation | Premium | Research |
| SUB-04 | Stripe Customer Portal for subscription management | Premium | Research |
| SUB-05 | Webhook handling: customer.subscription.created | Premium | Research |
| SUB-06 | Webhook handling: customer.subscription.updated | Premium | Research |
| SUB-07 | Webhook handling: customer.subscription.deleted | Premium | Research |
| SUB-08 | Webhook handling: invoice.payment_failed | Premium | Research |
| SUB-09 | Webhook handling: invoice.payment_succeeded | Premium | Research |
| SUB-10 | Webhook handling: checkout.session.completed | Premium | Research |
| SUB-11 | subscriptions table: status, plan, stripe_customer_id, stripe_subscription_id | Premium | 7.2 |
| SUB-12 | Graceful downgrade: data preserved, premium features locked | Premium | 6.2.5 |
| SUB-13 | Raw body parsing for Stripe webhook signature verification | Premium | Research |
| SUB-14 | STRIPE_PRICE_MONTHLY and STRIPE_PRICE_ANNUAL env vars | Premium | 7.6 |

## Category: PLAN — Daily Planner

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| PLAN-01 | task_templates table: recurring task definitions per pet | All | 5.10 |
| PLAN-02 | task_instances table: daily generated instances with completion status | All | 5.10 |
| PLAN-03 | Task completion with long-press interaction (backend tracks completion) | All | 5.10 |
| PLAN-04 | Frequency rules: daily, weekly, custom intervals | All | 5.10 |
| PLAN-05 | Default task templates seeded for all 14 species | All | 7.8.3 |
| PLAN-06 | 9 planner API endpoints | All | 5.10 |
| PLAN-07 | planner_preferences table: user planner settings (theme, visibility, style) | All | 5.13 |
| PLAN-08 | Show/hide planner modules | All | 5.13 |
| PLAN-09 | Preset themes (premium only) | Premium | 5.13 |

## Category: GARDEN — Care Garden

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| GARDEN-01 | garden_state table: daily completion state per pet | All | 5.1 |
| GARDEN-02 | Daily completion count tracking | All | 5.1 |
| GARDEN-03 | Full Bloom detection (all tasks completed for the day) | All | 5.1 |
| GARDEN-04 | Garden history (past days' states) | All | 5.1 |
| GARDEN-05 | garden_decor_unlocks table: streak-based unlock progression | All | 5.1 |
| GARDEN-06 | garden_preferences table: active decor selections | All | 5.1 |
| GARDEN-07 | Premium decor items | Premium | 5.1 |
| GARDEN-08 | 6 garden API endpoints | All | 5.1 |
| GARDEN-09 | Redis caching for garden state | All | 7.1 |

## Category: STREAK — Task Streaks & Badges

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| STREAK-01 | task_streaks table: per-task independent current and longest streaks | All | 5.2 |
| STREAK-02 | streak_milestones table: achieved badge milestones | All | 5.2 |
| STREAK-03 | 6-tier badge system: 7d, 14d, 30d, 90d, 180d, 365d | All | 5.2 |
| STREAK-04 | Skip functionality: max 3 consecutive skips without breaking streak | All | 5.2 |
| STREAK-05 | 5 streak API endpoints | All | 5.2 |
| STREAK-06 | Redis caching for streak data | All | 7.1 |

## Category: HEALTH — Health Tracking

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| HEALTH-01 | weight_logs table: pet weight entries with date and unit | All | 5.3 |
| HEALTH-02 | Weight trend calculation (up/down/stable) | All | 5.3 |
| HEALTH-03 | vet_visits table: veterinary visit records | All | 5.3 |
| HEALTH-04 | vet_visit_attachments table: files attached to vet visits | All | 5.3 |
| HEALTH-05 | medications table: medication definitions and schedules | All | 5.3 |
| HEALTH-06 | medication_administrations table: individual dose administration logs | All | 5.3 |
| HEALTH-07 | 11 health tracking API endpoints | All | 5.3 |
| HEALTH-08 | Medical disclaimer text served via API | All | 6.1.1 |
| HEALTH-09 | First-time health feature acknowledgment screen data (boolean + timestamp) | All | 6.1.2 |
| HEALTH-10 | Weight trend disclaimer text served via API | All | 6.1.3 |
| HEALTH-11 | Medication disclaimer text served via API | All | 6.1.4 |

## Category: TRACK — Custom Trackers

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| TRACK-01 | custom_trackers table: user-created tracking items | All | 5.4 |
| TRACK-02 | 10 pre-made tracker templates | All | 5.4 |
| TRACK-03 | 3 custom trackers for free, unlimited for premium | Free/Premium | 5.4 |
| TRACK-04 | 6 custom tracker API endpoints | All | 5.4 |

## Category: PHOTO — Photo Gallery

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| PHOTO-01 | photos table: pet photos with 3-size URLs and metadata | All | 5.5 |
| PHOTO-02 | 3-size processing pipeline: thumbnail, medium, original | All | 5.5 |
| PHOTO-03 | EXIF data stripping on upload | All | 5.5 |
| PHOTO-04 | Daily upload limits: 3 free, unlimited premium | Free/Premium | 5.5 |
| PHOTO-05 | 5 photo gallery API endpoints | All | 5.5 |
| PHOTO-06 | Sharp library for image processing | All | Research |
| PHOTO-07 | BullMQ for async photo processing jobs | All | Research |

## Category: AVATAR — Interactive Avatar & Mood

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| AVATAR-01 | pet_mood_state table: current avatar mood per pet | All | 5.6 |
| AVATAR-02 | Priority-based mood algorithm: sleeping > sad > waiting > happy | All | 5.6 |
| AVATAR-03 | Redis caching for avatar mood state | All | 7.1 |
| AVATAR-04 | Mood recalculation on task completion events | All | 5.6 |

## Category: TIMELINE — Pet Legacy Timeline

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| TIMELINE-01 | timeline_events table: auto-generated and manual entries | All | 5.7 |
| TIMELINE-02 | Auto-generation from all app activity (task completions, photos, milestones, etc.) | All | 5.7 |
| TIMELINE-03 | Manual timeline entry creation | All | 5.7 |
| TIMELINE-04 | Category filtering for timeline | All | 5.7 |
| TIMELINE-05 | Chronological life story view | All | 5.7 |
| TIMELINE-06 | 7 timeline API endpoints | All | 5.7 |

## Category: MEMORIAL — Memorial Mode

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| MEMORIAL-01 | pet_memorial table: memorial mode activation records | All | 5.7 |
| MEMORIAL-02 | Mark pet as passed away | All | 5.7 |
| MEMORIAL-03 | Stop all reminders/notifications for memorialized pet | All | 5.7 |
| MEMORIAL-04 | PDF export of pet timeline | All | 5.7 |
| MEMORIAL-05 | PDFKit library for timeline PDF generation | All | Research |
| MEMORIAL-06 | Time Capsules remain sealed until memorial or re-subscribe | All | 6.2.5 |

## Category: CIRCLE — Care Circles

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| CIRCLE-01 | care_circles table: circle definitions and settings | All | 5.8 |
| CIRCLE-02 | circle_members table: membership and roles | All | 5.8 |
| CIRCLE-03 | circle_posts table: shared content in circles | All | 5.8 |
| CIRCLE-04 | circle_comments table: comments on posts | All | 5.8 |
| CIRCLE-05 | circle_reactions table: reactions on posts | All | 5.8 |
| CIRCLE-06 | circle_reports table: reported content/users | All | 5.8 |
| CIRCLE-07 | Private groups: 5-20 members | All | 5.8 |
| CIRCLE-08 | Invite system (links + QR codes) | All | 5.8 |
| CIRCLE-09 | Content reporting flow | All | 5.8 |
| CIRCLE-10 | 15 Care Circle API endpoints | All | 5.8 |

## Category: KIT — Party Kits

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| KIT-01 | party_kit_templates table: admin-managed kit definitions | All | 5.14 |
| KIT-02 | party_kit_steps table: step templates within each kit | All | 5.14 |
| KIT-03 | user_kit_progress table: user progress through a kit | All | 5.14 |
| KIT-04 | user_kit_step_responses table: individual step responses (JSONB) | All | 5.14 |
| KIT-05 | 4 Phase 1 kits: Birthday, Adoption Anniversary, New Pet Welcome, Senior Pet Comfort | All | 5.14.3 |
| KIT-06 | 8 step types with type-specific validation | All | 5.14.4 |
| KIT-07 | Intelligent pacing: timing algorithm, behavior adaptation | All | 5.14.8 |
| KIT-08 | Cinematic completion experience (backend triggers) | All | 5.14.9 |
| KIT-09 | Legacy Celebration Archive: storage, memorial transformation | All | 5.14.10 |
| KIT-10 | 30+ Party Kit API endpoints across 5 endpoint groups | All | 5.14.12 |
| KIT-11 | Free tier: limited steps per kit | Free/Premium | 5.14 |
| KIT-12 | Seed data: all 4 kit templates with complete steps | All | 7.8.3 |

## Category: CAPSULE — Time Capsules

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| CAPSULE-01 | time_capsules table: sealed/delivered capsule records | All | 5.14.5 |
| CAPSULE-02 | AES-256-GCM encryption with separate key per capsule | All | 5.14.5, 6.8.3 |
| CAPSULE-03 | CAPSULE_ENCRYPTION_MASTER_KEY for key derivation | All | 7.6 |
| CAPSULE-04 | Seal flow: record content, encrypt, set delivery date | All | 5.14.5 |
| CAPSULE-05 | Delivery flow: check date, generate signed URL, send notification | All | 5.14.5 |
| CAPSULE-06 | Early release option | All | 5.14.5 |
| CAPSULE-07 | Encrypted media stored in separate poshpet-capsules bucket | All | 7.5 |
| CAPSULE-08 | Signed URLs for capsule content ONLY after delivery date verification | All | 7.5.2 |
| CAPSULE-09 | Encrypted media deleted 90 days after capsule opened | All | 6.3.3 |

## Category: MEMORY — Living Memory Pages

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| MEMORY-01 | memory_pages table: generated Memory Page content | All | 5.14.6 |
| MEMORY-02 | Year-over-year navigation | All | 5.14.6 |
| MEMORY-03 | Export options (share image, PDF) | All | 5.14.6 |
| MEMORY-04 | circle_contributions table: Care Circle contributions to kits | All | 5.14.7 |
| MEMORY-05 | Contributor invitation flow with deadline | All | 5.14.7 |

## Category: NOTIF — Smart Notifications

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| NOTIF-01 | notification_preferences table: per-category user preferences | All | 5.11 |
| NOTIF-02 | notification_logs table: sent notification history and engagement | All | 5.11 |
| NOTIF-03 | Quiet hours support (user-configurable) | All | 5.11 |
| NOTIF-04 | Notification bundling: 3+ within 30 min combined into digest | All | 5.11 |
| NOTIF-05 | Firebase Cloud Messaging (FCM) for push notifications (iOS + Android) | All | 7.1 |
| NOTIF-06 | 6 notification API endpoints | All | 5.11 |
| NOTIF-07 | Device token registration/unregistration | All | 6.3.1 |

## Category: ADMIN — Admin Panel API

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| ADMIN-01 | User management: search, view, suspend/ban | Admin | 5.13 |
| ADMIN-02 | Subscription management: view status, manual overrides | Admin | 5.13 |
| ADMIN-03 | Content moderation queue: approve, remove, warn, suspend | Admin | 6.7.2 |
| ADMIN-04 | Kit management: CRUD kit templates, steps, toggle active, preview | Admin | 5.14.14 |
| ADMIN-05 | Kit analytics: start rate, completion funnel, capsule seal rate | Admin | 5.14.14 |
| ADMIN-06 | Analytics dashboard: DAU, task completions, Full Blooms, kit starts | Admin | 7.3 |
| ADMIN-07 | Solo founder management interface (single admin user) | Admin | 5.13 |

## Category: AI — Invisible AI

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| AI-01 | Behind-the-scenes optimization (never user-facing) | All | 5.14.8 |
| AI-02 | Notification timing optimization | All | 5.11 |
| AI-03 | Kit pacing adaptation based on user behavior | All | 5.14.8 |
| AI-04 | Rules-based engine (not ML) for Phase 1 | All | Doc 3 |

## Category: CRON — Scheduled Jobs

| ID | Requirement | Tier | Priority | PDF Ref |
|----|------------|------|----------|---------|
| CRON-01 | time_capsule_delivery: Daily 9AM UTC — deliver sealed capsules on delivery_date | All | Critical | 7.3 |
| CRON-02 | streak_reset_check: Daily 12:05 AM per timezone — reset unfinished streaks | All | Critical | 7.3 |
| CRON-03 | backup_verification: Weekly Mon 5AM UTC — verify backup, alert if >48hr old | All | Critical | 7.3 |
| CRON-04 | garden_state_reset: Daily 12:01 AM per timezone — create new daily garden state | All | High | 7.3 |
| CRON-05 | task_instance_generation: Daily 12:02 AM per timezone — generate today's task instances | All | High | 7.3 |
| CRON-06 | notification_digest: Every 30 min — process queue, bundle, enforce quiet hours | All | Normal | 7.3 |
| CRON-07 | kit_pacing_check: Daily 10AM UTC — check kit next-step prompts | All | Normal | 7.3 |
| CRON-08 | expired_invite_cleanup: Daily 3AM UTC — delete expired circle invites (7d) and QR codes (24h) | All | Low | 7.3 |
| CRON-09 | photo_cleanup: Weekly Sun 4AM UTC — remove orphaned photo files, retry failed jobs | All | Low | 7.3 |
| CRON-10 | analytics_snapshot: Daily 1AM UTC — capture daily metrics for admin dashboard | All | Low | 7.3 |

## Category: FILE — File Storage & Processing

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| FILE-01 | Cloudflare R2 (S3-compatible) integration | All | 7.5 |
| FILE-02 | 3 buckets: poshpet-media (private), poshpet-capsules (restricted), poshpet-static (public CDN) | All | 7.5.1 |
| FILE-03 | Signed URLs with 1-hour expiry for media bucket | All | 7.5.2 |
| FILE-04 | Separate IAM credentials for capsule bucket | All | 7.5.2 |
| FILE-05 | Directory structure: photos/{user}/{pet}/{photo_id}_{size}.jpg | All | 7.5.1 |
| FILE-06 | Directory structure: avatars/{user}/{pet_id}_avatar.jpg | All | 7.5.1 |
| FILE-07 | Directory structure: vet-attachments/{user}/{visit_id}/{attachment_id}.jpg | All | 7.5.1 |
| FILE-08 | Directory structure: circle-media/{circle}/{post}/{media_id}.jpg | All | 7.5.1 |
| FILE-09 | Directory structure: memory-pages/{user}/{page_id}_{type} | All | 7.5.1 |
| FILE-10 | Upload rate limiting: 10 requests per minute per user | All | 7.4.6 |

## Category: API — API Conventions & Standards

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| API-01 | Base URL: /v1/ path versioning | All | 7.4.1 |
| API-02 | RESTful design: plural nouns, nested resources for ownership | All | 7.4.1 |
| API-03 | Methods: GET, POST, PUT, DELETE (no PATCH in Phase 1) | All | 7.4.1 |
| API-04 | Success response format: { success: true, data: {}, meta: {} } | All | 7.4.3 |
| API-05 | Error response format: { success: false, error: { code, message, field? } } | All | 7.4.3 |
| API-06 | 9 standardized error codes (400-500) | All | 7.4.4 |
| API-07 | Offset-based pagination: ?page=1&limit=50 (max 100) | All | 7.4.5 |
| API-08 | Pagination meta: page, limit, total, has_more | All | 7.4.5 |
| API-09 | Default sort: created_at DESC, configurable via ?sort=&order= | All | 7.4.5 |
| API-10 | General rate limiting: 100 req/min per authenticated user | All | 7.4.6 |
| API-11 | Auth rate limiting: 5 req/15min per IP | All | 7.4.6 |
| API-12 | Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset | All | 7.4.6 |
| API-13 | Content type: application/json (multipart/form-data for uploads) | All | 7.4.3 |
| API-14 | Request body validation using class-validator/class-transformer (NestJS) | All | 7.7.1 |
| API-15 | Global exception filters (AllExceptionsFilter, HttpExceptionFilter) for standardized error responses across all routes | All | 7.7 |
| API-16 | Global validation pipe with whitelist and transform options | All | 7.7.1 |

## Category: SECURITY — Data Security Standards

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| SEC-01 | TLS 1.3 for all API communication | All | 6.8.1 |
| SEC-02 | HSTS header enabled | All | 6.8.1 |
| SEC-03 | Bcrypt password hashing (minimum 12 rounds) | All | 6.8.2 |
| SEC-04 | CORS: allow only app.poshpet.app origins | All | 7.8.5 |
| SEC-05 | All secrets via environment variables, never in source code | All | 7.6 |
| SEC-06 | 5xx errors reported to Sentry with full stack trace | All | 7.7.3 |
| SEC-07 | 4xx errors logged locally only (not to Sentry) | All | 7.7.3 |
| SEC-08 | Critical failures (DB, Stripe webhooks, capsule encryption) → Sentry alert + admin email | All | 7.7.3 |
| SEC-09 | Resource ownership: scope all queries to authenticated user_id | All | 7.7.2 |
| SEC-10 | Return 404 (not 403) for resources belonging to other users (prevent enumeration) | All | 7.7.2 |
| SEC-11 | Optimistic locking with updated_at timestamp checks for concurrent modifications | All | 7.7.2 |
| SEC-12 | npm audit: no critical vulnerabilities | All | 7.8.5 |
| SEC-13 | Database not accessible from public internet | All | 6.8.4 |
| SEC-14 | All auth events, data access, and admin actions logged (90-day retention) | All | 6.8.4 |

## Category: COMPLIANCE — Legal, GDPR, CCPA

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| COMP-01 | GDPR Right of Access: "Download My Data" endpoint (JSON/ZIP, within 30 days) | All | 6.4.2 |
| COMP-02 | GDPR Right of Erasure: account deletion endpoint (completed within 30 days) | All | 6.4.2 |
| COMP-03 | GDPR Right of Portability: machine-readable JSON data export (within 30 days) | All | 6.4.2 |
| COMP-04 | GDPR Right to Restrict Processing: freeze account endpoint (within 72 hours) | All | 6.4.2 |
| COMP-05 | GDPR Right to Object: opt-out of analytics/marketing (immediate) | All | 6.4.2 |
| COMP-06 | CCPA "Do Not Sell My Personal Information" endpoint | All | 6.5.1 |
| COMP-07 | Medical disclaimers served via API (4 disclaimer texts) | All | 6.1 |
| COMP-08 | Privacy contact email: privacy@poshpet.app for data inquiries | All | 6.4.4 |
| COMP-09 | Anonymized aggregate analytics retained after account deletion | All | 6.3.3 |
| COMP-10 | Database backups containing deleted data purged within 30 days | All | 6.3.3 |

## Category: MOD — Content Moderation

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| MOD-01 | NSFW image detection on photo uploads (AWS Rekognition or similar) | All | 6.7.2 |
| MOD-02 | Keyword filtering in Care Circle text posts | All | 6.7.2 |
| MOD-03 | User report button on all user-generated content | All | 6.7.2 |
| MOD-04 | Admin moderation queue: approve, remove, warn user, suspend user | Admin | 6.7.2 |
| MOD-05 | Moderation actions: warning (1st), suspension (2nd), permanent ban (3rd) for harassment | Admin | 6.7.1 |
| MOD-06 | Immediate removal + account suspension for NSFW/violence/illegal content | Admin | 6.7.1 |

## Category: EMAIL — Transactional Email

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| EMAIL-01 | Brevo (Sendinblue) integration for transactional email | All | PROJECT.md |
| EMAIL-02 | Email verification on registration | All | 6.8.2 |
| EMAIL-03 | Password reset emails | All | 6.8.2 |
| EMAIL-04 | Capsule delivery notification emails | All | 5.14.5 |
| EMAIL-05 | Account deletion confirmation emails | All | 6.4.2 |
| EMAIL-06 | Critical failure alert emails to admin | Admin | 7.7.3 |

## Category: INFRA — Infrastructure & DevOps

| ID | Requirement | Tier | PDF Ref |
|----|------------|------|---------|
| INFRA-01 | Docker Compose for local dev (PostgreSQL 16 + Redis 7) | All | PROJECT.md |
| INFRA-02 | TypeORM migrations (synchronize: false in all environments) | All | Research |
| INFRA-03 | Health check endpoint using @nestjs/terminus (Postgres, Redis, disk, memory indicators) | All | 7.8.1 |
| INFRA-04 | Swagger/OpenAPI documentation | All | Boilerplate |
| INFRA-05 | 21 environment variables configured | All | 7.6 |
| INFRA-06 | Sentry error tracking integration | All | 7.6 |
| INFRA-07 | Stateless design for future horizontal scaling | All | 7.1 |
| INFRA-08 | UUID primary keys on all tables | All | 7.2 |
| INFRA-09 | TIMESTAMP WITH TIME ZONE for all date columns | All | PROJECT.md |

---

## Database Summary

**35 tables across 8 domains:**

| Domain | Tables | Count |
|--------|--------|-------|
| Core | users, pets, subscriptions | 3 |
| Planner & Tasks | task_templates, task_instances, custom_trackers, planner_preferences | 4 |
| Progress & Achievements | garden_state, garden_decor_unlocks, garden_preferences, task_streaks, streak_milestones | 5 |
| Health Tracking | weight_logs, vet_visits, vet_visit_attachments, medications, medication_administrations | 5 |
| Media & Timeline | photos, timeline_events, pet_memorial, pet_mood_state | 4 |
| Social (Care Circles) | care_circles, circle_members, circle_posts, circle_comments, circle_reactions, circle_reports | 6 |
| Party Kits | party_kit_templates, party_kit_steps, user_kit_progress, user_kit_step_responses, time_capsules, memory_pages, circle_contributions | 7 |
| Notifications | notification_preferences, notification_logs | 2 |
| **Total** | | **36** |

## API Endpoint Summary

| Domain | Endpoint Count |
|--------|---------------|
| Pets | 7 |
| Daily Planner | 9 |
| Care Garden | 6 |
| Streak Badges | 5 |
| Health Tracking | 11 |
| Custom Trackers | 6 |
| Photo Gallery | 5 |
| Pet Legacy Timeline | 7 |
| Care Circles | 15 |
| Party Kits | 30+ |
| Notifications | 6 |
| Auth | ~8 |
| Subscriptions | ~5 |
| Admin | ~15 |
| Compliance/GDPR | ~5 |
| **Total** | **~140+** |

## Cron Job Summary

| Priority | Jobs | Count |
|----------|------|-------|
| Critical | time_capsule_delivery, streak_reset_check, backup_verification | 3 |
| High | garden_state_reset, task_instance_generation | 2 |
| Normal | notification_digest, kit_pacing_check | 2 |
| Low | expired_invite_cleanup, photo_cleanup, analytics_snapshot | 3 |
| **Total** | | **10** |

---

*Extracted from POSHPET.pdf (123 pages, 5 documents) on 2026-03-02.*
*Stack decisions from PROJECT.md override PDF defaults (NestJS+TypeORM over Express+Prisma, Better-Auth over Supabase Auth, Brevo over Mailgun/Resend).*

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| AUTH-07 | Phase 2 | Pending |
| AUTH-08 | Phase 2 | Pending |
| AUTH-09 | Phase 2 | Pending |
| AUTH-10 | Phase 2 | Pending |
| AUTH-11 | Phase 2 | Pending |
| AUTH-12 | Phase 2 | Pending |
| AUTH-13 | Phase 2 | Pending |
| AUTH-14 | Phase 2 | Pending |
| USER-01 | Phase 2 | Pending |
| USER-02 | Phase 2 | Pending |
| USER-03 | Phase 2 | Pending |
| USER-04 | Phase 2 | Pending |
| USER-05 | Phase 2 | Pending |
| USER-06 | Phase 2 | Pending |
| PET-01 | Phase 2 | Pending |
| PET-02 | Phase 2 | Pending |
| PET-03 | Phase 2 | Pending |
| PET-04 | Phase 2 | Pending |
| PET-05 | Phase 2 | Pending |
| PET-06 | Phase 2 | Pending |
| PET-07 | Phase 2 | Pending |
| SUB-01 | Phase 2 | Pending |
| SUB-02 | Phase 2 | Pending |
| SUB-03 | Phase 2 | Pending |
| SUB-04 | Phase 2 | Pending |
| SUB-05 | Phase 2 | Pending |
| SUB-06 | Phase 2 | Pending |
| SUB-07 | Phase 2 | Pending |
| SUB-08 | Phase 2 | Pending |
| SUB-09 | Phase 2 | Pending |
| SUB-10 | Phase 2 | Pending |
| SUB-11 | Phase 2 | Pending |
| SUB-12 | Phase 2 | Pending |
| SUB-13 | Phase 2 | Pending |
| SUB-14 | Phase 2 | Pending |
| PLAN-01 | Phase 3 | Pending |
| PLAN-02 | Phase 3 | Pending |
| PLAN-03 | Phase 3 | Pending |
| PLAN-04 | Phase 3 | Pending |
| PLAN-05 | Phase 3 | Pending |
| PLAN-06 | Phase 3 | Pending |
| PLAN-07 | Phase 3 | Pending |
| PLAN-08 | Phase 3 | Pending |
| PLAN-09 | Phase 3 | Pending |
| GARDEN-01 | Phase 3 | Pending |
| GARDEN-02 | Phase 3 | Pending |
| GARDEN-03 | Phase 3 | Pending |
| GARDEN-04 | Phase 3 | Pending |
| GARDEN-05 | Phase 3 | Pending |
| GARDEN-06 | Phase 3 | Pending |
| GARDEN-07 | Phase 3 | Pending |
| GARDEN-08 | Phase 3 | Pending |
| GARDEN-09 | Phase 3 | Pending |
| STREAK-01 | Phase 3 | Pending |
| STREAK-02 | Phase 3 | Pending |
| STREAK-03 | Phase 3 | Pending |
| STREAK-04 | Phase 3 | Pending |
| STREAK-05 | Phase 3 | Pending |
| STREAK-06 | Phase 3 | Pending |
| AVATAR-01 | Phase 3 | Pending |
| AVATAR-02 | Phase 3 | Pending |
| AVATAR-03 | Phase 3 | Pending |
| AVATAR-04 | Phase 3 | Pending |
| HEALTH-01 | Phase 4 | Pending |
| HEALTH-02 | Phase 4 | Pending |
| HEALTH-03 | Phase 4 | Pending |
| HEALTH-04 | Phase 4 | Pending |
| HEALTH-05 | Phase 4 | Pending |
| HEALTH-06 | Phase 4 | Pending |
| HEALTH-07 | Phase 4 | Pending |
| HEALTH-08 | Phase 4 | Pending |
| HEALTH-09 | Phase 4 | Pending |
| HEALTH-10 | Phase 4 | Pending |
| HEALTH-11 | Phase 4 | Pending |
| TRACK-01 | Phase 4 | Pending |
| TRACK-02 | Phase 4 | Pending |
| TRACK-03 | Phase 4 | Pending |
| TRACK-04 | Phase 4 | Pending |
| PHOTO-01 | Phase 4 | Pending |
| PHOTO-02 | Phase 4 | Pending |
| PHOTO-03 | Phase 4 | Pending |
| PHOTO-04 | Phase 4 | Pending |
| PHOTO-05 | Phase 4 | Pending |
| PHOTO-06 | Phase 4 | Pending |
| PHOTO-07 | Phase 4 | Pending |
| TIMELINE-01 | Phase 4 | Pending |
| TIMELINE-02 | Phase 4 | Pending |
| TIMELINE-03 | Phase 4 | Pending |
| TIMELINE-04 | Phase 4 | Pending |
| TIMELINE-05 | Phase 4 | Pending |
| TIMELINE-06 | Phase 4 | Pending |
| MEMORIAL-01 | Phase 4 | Pending |
| MEMORIAL-02 | Phase 4 | Pending |
| MEMORIAL-03 | Phase 4 | Pending |
| MEMORIAL-04 | Phase 4 | Pending |
| MEMORIAL-05 | Phase 4 | Pending |
| MEMORIAL-06 | Phase 4 | Pending |
| CIRCLE-01 | Phase 5 | Pending |
| CIRCLE-02 | Phase 5 | Pending |
| CIRCLE-03 | Phase 5 | Pending |
| CIRCLE-04 | Phase 5 | Pending |
| CIRCLE-05 | Phase 5 | Pending |
| CIRCLE-06 | Phase 5 | Pending |
| CIRCLE-07 | Phase 5 | Pending |
| CIRCLE-08 | Phase 5 | Pending |
| CIRCLE-09 | Phase 5 | Pending |
| CIRCLE-10 | Phase 5 | Pending |
| MOD-01 | Phase 5 | Pending |
| MOD-02 | Phase 5 | Pending |
| MOD-03 | Phase 5 | Pending |
| MOD-04 | Phase 5 | Pending |
| MOD-05 | Phase 5 | Pending |
| MOD-06 | Phase 5 | Pending |
| NOTIF-01 | Phase 5 | Pending |
| NOTIF-02 | Phase 5 | Pending |
| NOTIF-03 | Phase 5 | Pending |
| NOTIF-04 | Phase 5 | Pending |
| NOTIF-05 | Phase 5 | Pending |
| NOTIF-06 | Phase 5 | Pending |
| NOTIF-07 | Phase 5 | Pending |
| KIT-01 | Phase 6 | Pending |
| KIT-02 | Phase 6 | Pending |
| KIT-03 | Phase 6 | Pending |
| KIT-04 | Phase 6 | Pending |
| KIT-05 | Phase 6 | Pending |
| KIT-06 | Phase 6 | Pending |
| KIT-07 | Phase 6 | Pending |
| KIT-08 | Phase 6 | Pending |
| KIT-09 | Phase 6 | Pending |
| KIT-10 | Phase 6 | Pending |
| KIT-11 | Phase 6 | Pending |
| KIT-12 | Phase 6 | Pending |
| CAPSULE-01 | Phase 6 | Pending |
| CAPSULE-02 | Phase 6 | Pending |
| CAPSULE-03 | Phase 6 | Pending |
| CAPSULE-04 | Phase 6 | Pending |
| CAPSULE-05 | Phase 6 | Pending |
| CAPSULE-06 | Phase 6 | Pending |
| CAPSULE-07 | Phase 6 | Pending |
| CAPSULE-08 | Phase 6 | Pending |
| CAPSULE-09 | Phase 6 | Pending |
| MEMORY-01 | Phase 6 | Pending |
| MEMORY-02 | Phase 6 | Pending |
| MEMORY-03 | Phase 6 | Pending |
| MEMORY-04 | Phase 6 | Pending |
| MEMORY-05 | Phase 6 | Pending |
| AI-01 | Phase 6 | Pending |
| AI-02 | Phase 6 | Pending |
| AI-03 | Phase 6 | Pending |
| AI-04 | Phase 6 | Pending |
| ADMIN-01 | Phase 7 | Pending |
| ADMIN-02 | Phase 7 | Pending |
| ADMIN-03 | Phase 7 | Pending |
| ADMIN-04 | Phase 7 | Pending |
| ADMIN-05 | Phase 7 | Pending |
| ADMIN-06 | Phase 7 | Pending |
| ADMIN-07 | Phase 7 | Pending |
| COMP-01 | Phase 7 | Pending |
| COMP-02 | Phase 7 | Pending |
| COMP-03 | Phase 7 | Pending |
| COMP-04 | Phase 7 | Pending |
| COMP-05 | Phase 7 | Pending |
| COMP-06 | Phase 7 | Pending |
| COMP-07 | Phase 7 | Pending |
| COMP-08 | Phase 7 | Pending |
| COMP-09 | Phase 7 | Pending |
| COMP-10 | Phase 7 | Pending |
| CRON-01 | Phase 6 | Pending |
| CRON-02 | Phase 3 | Pending |
| CRON-03 | Phase 7 | Pending |
| CRON-04 | Phase 3 | Pending |
| CRON-05 | Phase 3 | Pending |
| CRON-06 | Phase 5 | Pending |
| CRON-07 | Phase 6 | Pending |
| CRON-08 | Phase 5 | Pending |
| CRON-09 | Phase 4 | Pending |
| CRON-10 | Phase 7 | Pending |
| FILE-01 | Phase 1 | Pending |
| FILE-02 | Phase 1 | Pending |
| FILE-03 | Phase 1 | Pending |
| FILE-04 | Phase 1 | Pending |
| FILE-05 | Phase 1 | Pending |
| FILE-06 | Phase 1 | Pending |
| FILE-07 | Phase 1 | Pending |
| FILE-08 | Phase 1 | Pending |
| FILE-09 | Phase 1 | Pending |
| FILE-10 | Phase 1 | Pending |
| API-01 | Phase 1 | Pending |
| API-02 | Phase 1 | Pending |
| API-03 | Phase 1 | Pending |
| API-04 | Phase 1 | Pending |
| API-05 | Phase 1 | Pending |
| API-06 | Phase 1 | Pending |
| API-07 | Phase 1 | Pending |
| API-08 | Phase 1 | Pending |
| API-09 | Phase 1 | Pending |
| API-10 | Phase 1 | Pending |
| API-11 | Phase 1 | Pending |
| API-12 | Phase 1 | Pending |
| API-13 | Phase 1 | Pending |
| API-14 | Phase 1 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Complete |
| SEC-06 | Phase 1 | Pending |
| SEC-07 | Phase 1 | Pending |
| SEC-08 | Phase 1 | Pending |
| SEC-09 | Phase 1 | Pending |
| SEC-10 | Phase 1 | Pending |
| SEC-11 | Phase 1 | Pending |
| SEC-12 | Phase 1 | Complete |
| SEC-13 | Phase 1 | Complete |
| SEC-14 | Phase 1 | Pending |
| EMAIL-01 | Phase 1 | Pending |
| EMAIL-02 | Phase 1 | Pending |
| EMAIL-03 | Phase 1 | Pending |
| EMAIL-04 | Phase 1 | Pending |
| EMAIL-05 | Phase 1 | Pending |
| EMAIL-06 | Phase 1 | Pending |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 1 | Complete |
| INFRA-06 | Phase 1 | Pending |
| INFRA-07 | Phase 1 | Complete |
| INFRA-08 | Phase 1 | Complete |
| INFRA-09 | Phase 1 | Complete |

**Coverage:** 236/236 requirements mapped. No orphans.

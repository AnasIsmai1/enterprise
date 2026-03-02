# PoshPet Backend API

## What This Is

The backend API server for PoshPet — a luxury daily pet care planner that transforms routine pet care into a beautiful, mindful ritual. Positioned as "Headspace meets Duolingo for pet parents," PoshPet combines elegant gamification and genuine emotional connection to help users provide consistent, devoted care to their pets. This project covers the complete Phase 1 backend: RESTful API, database layer, authentication, payments, file processing, cron jobs, and admin endpoints — everything the mobile app, web app, and admin panel need to function.

## Core Value

The backend must reliably track daily pet care tasks, calculate streaks/moods in real-time, and preserve every moment in the Pet Legacy Timeline — because years of a user's devotion depend on this data never being lost or incorrect.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Authentication system (email/password, Apple Sign-In, Google Sign-In) with JWT access/refresh tokens
- [ ] User account management (registration, login, profile, account deletion with 14-day grace period)
- [ ] Pet CRUD with multi-pet support (1 free, unlimited premium) across 14 species
- [ ] Subscription management via Stripe (free tier, $14.99/mo, $149.99/yr) with webhook handling
- [ ] Daily Planner API — task templates, daily task instance generation, task completion with long-press
- [ ] Care Garden state tracking — daily completion counts, Full Bloom detection, garden history
- [ ] Garden Decor system — streak-based unlock progression, premium decor preferences
- [ ] Task Streak engine — per-task independent streaks, 6-tier badge system (7d-365d), skip functionality (max 3 consecutive)
- [ ] Health Tracking — weight logs with trend calculation, vet visit records with attachments, medication schedules with dose administration logging
- [ ] Custom Trackers — 10 pre-made templates + user-created trackers (3 free, unlimited premium)
- [ ] Photo Gallery — upload with 3-size processing pipeline (thumbnail/medium/original), EXIF stripping, daily limits (3 free, unlimited premium)
- [ ] Interactive Avatar mood calculation — priority-based algorithm (sleeping > sad > waiting > happy) with Redis caching
- [ ] Pet Legacy Timeline — auto-generated chronological life story from all app activity, manual entries, category filtering
- [ ] Memorial Mode — mark pet as passed away, stop reminders, PDF export of timeline
- [ ] Care Circles — private groups (5-20 members), invite system, posts/comments/reactions, content reporting
- [ ] Party Kits — guided celebration experiences with Time Capsules (AES-256 encrypted, sealed/delivered), Living Memory Pages, AI pacing, Circle contributions
- [ ] Smart Notification system — intelligent reminders with quiet hours, notification bundling, per-category preferences
- [ ] Pet Selector / multi-pet switching context
- [ ] Planner Customization — show/hide modules, preset themes (premium)
- [ ] Admin Panel API — solo founder management interface, content moderation queue, analytics dashboard
- [ ] Invisible AI — behind-the-scenes optimization for notification timing and kit pacing (never user-facing)
- [ ] 9 cron jobs — streak resets, garden state generation, task instance creation, Time Capsule delivery, notification digest, kit pacing, cleanup jobs, analytics snapshots, backup verification
- [ ] Rate limiting — 100 req/min general, 5 req/15min auth, 10 req/min uploads
- [ ] File storage integration — Cloudflare R2/S3 with signed URLs (1-hour expiry), 3 bucket structure (media, capsules, static)
- [ ] GDPR/CCPA compliance endpoints — data export, account deletion, privacy controls
- [ ] Medical disclaimers served via API for health tracking features
- [ ] Health disclaimer acknowledgment tracking per user

### Out of Scope

- Frontend (React Native mobile app, React web app) — separate project
- Lottie animation files and design assets — frontend concern
- Medical diagnosis, AI health recommendations — PoshPet is observation-only
- Public social features (profiles/feeds/following) — Care Circles are private only
- Enterprise features (multi-user business accounts, vet clinic integrations, third-party API access)
- Service Provider Marketplace (Phase 2)
- Boutique Marketplace (Phase 3)
- Real-time chat, video posts, OAuth influencer programs

## Context

PoshPet Phase 1 Technical Documentation is a 123-page, 5-document spec covering the complete product vision. This backend project implements the server-side of that spec. The doc provides complete database schemas (35 tables), all API endpoint definitions, cron job specifications, error handling standards, and security requirements.

Target audience: Affluent pet parents (household income $75K+), women aged 28-45, urban/suburban. Premium tier: $14.99/month or $149.99/year (PoshPet Society membership).

The backend serves three clients:
1. **Mobile App** — React Native (iOS + Android)
2. **Web App** — React with Vite (responsive, mobile-first)
3. **Admin Panel** — React web app (separate route or subdomain)

All clients communicate via RESTful HTTPS endpoints. No direct database access from clients.

## Constraints

- **Tech Stack**: Node.js 20 LTS + NestJS + TypeScript + TypeORM — non-negotiable
- **Database**: PostgreSQL 15+ with UUID primary keys, TIMESTAMP WITH TIME ZONE for all dates
- **Cache**: Redis for JWT refresh tokens, garden state, streak data, avatar mood (various TTLs)
- **Auth**: Better-Auth (self-hosted) with @thallesp/nestjs-better-auth + @hedystia/better-auth-typeorm adapters. Simple @Roles() guards, no CASL
- **Payments**: Stripe with webhooks (customer.subscription.created/updated/deleted, invoice.payment_failed/succeeded)
- **File Storage**: Cloudflare R2 or AWS S3 compatible — signed URLs, 3 buckets (media, capsules, static)
- **Local Dev**: Docker Compose for PostgreSQL, Redis, and any other services
- **API Conventions**: RESTful, /v1/ versioning, plural nouns, Bearer JWT auth, offset-based pagination
- **Security**: Bcrypt 12+ rounds, JWT 15-min access / 7-day refresh, TLS 1.3, HSTS, rate limiting
- **Solo founder**: Architecture must be simple enough for one person to maintain, but stateless for future horizontal scaling

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| NestJS over Express | Modular architecture with DI handles 35-table, 8-domain project better than flat Express routes | Confirmed |
| TypeORM over Drizzle/Prisma | First-class NestJS integration, repository pattern, decorator-based entities match NestJS conventions | Confirmed |
| Docker Compose for local dev | Vendor-agnostic, portable, avoids cloud lock-in during development | Confirmed |
| Better-Auth over Clerk/DIY | Self-hosted, NestJS adapter exists (@thallesp/nestjs-better-auth), TypeORM adapter exists (@hedystia/better-auth-typeorm), built-in Apple/Google social login with mobile ID token support, simple @Roles() decorator replaces CASL, $0 forever, all data in own DB | Confirmed |
| Drop CASL RBAC | CASL is enterprise overkill for PoshPet's simple free/premium/admin model. Better-Auth's @Roles() + custom PremiumGuard is simpler and faster | Confirmed |
| Brevo for transactional email | Already partially wired in boilerplate, proven deliverability, 300 emails/day free tier. Better-Auth email hooks are provider-agnostic — Brevo plugs in via sendVerificationEmail/sendResetPassword callbacks | Confirmed |
| Backend-only scope | Frontend is a separate project; backend provides complete API surface for all three clients | Confirmed |
| @nestjs/terminus for health checks | Official NestJS health check module with readiness/liveness probes for Postgres, Redis, disk, memory. Integrates cleanly with NestJS DI | Confirmed |
| Global exception filters for error handling | NestJS global filters (AllExceptionsFilter, HttpExceptionFilter) catch all unhandled errors and return standardized error response format. Replaces per-controller try/catch | Confirmed |

---
*Last updated: 2026-03-02 — added Terminus health checks and global filters decisions*

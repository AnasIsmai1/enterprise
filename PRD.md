# PoshPet — Product Requirements Document

**Version:** 1.0
**Date:** February 25, 2026
**Phase:** 1 (Launch)
**Status:** Draft
**Source:** PoshPet Phase 1 Technical Documentation v3.0

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Target Audience](#3-target-audience)
4. [Product Vision & Principles](#4-product-vision--principles)
5. [Business Model](#5-business-model)
6. [Feature Requirements](#6-feature-requirements)
7. [Party Kits (Core Differentiator)](#7-party-kits-core-differentiator)
8. [User Stories](#8-user-stories)
9. [Technical Architecture](#9-technical-architecture)
10. [Database Design](#10-database-design)
11. [API Design](#11-api-design)
12. [Design System](#12-design-system)
13. [Security & Compliance](#13-security--compliance)
14. [Infrastructure & Deployment](#14-infrastructure--deployment)
15. [Success Metrics](#15-success-metrics)
16. [Phase 1 Scope & Exclusions](#16-phase-1-scope--exclusions)
17. [Risks & Mitigations](#17-risks--mitigations)
18. [Development Roadmap](#18-development-roadmap)

---

## 1. Product Overview

**Product Name:** PoshPet
**Tagline:** *"Turn daily pet care into a love story — captured forever, celebrated intentionally, remembered always."*

PoshPet is a luxury pet care planning and celebration platform (mobile + web) that transforms routine pet care into meaningful, emotionally rich experiences. It combines daily care management with milestone celebrations, memory preservation, and social sharing — all wrapped in a premium, emotionally resonant design language.

**Core Value Proposition:**
- **Daily Care → Ritual:** Elevates feeding, walks, and vet visits into intentional acts of love
- **Milestones → Celebrations:** Guided Party Kits turn birthdays and anniversaries into cinematic experiences
- **Memories → Legacy:** Time capsules, living memory pages, and pet timelines preserve the human-animal bond
- **Community → Care Circles:** Private groups enable shared pet care with trusted people

---

## 2. Problem Statement

Pet parents (especially millennial and Gen-Z women ages 28–45) deeply love their pets but lack tools that:

1. **Organize daily care** across multiple pets and species in one cohesive place
2. **Celebrate milestones** beyond a simple social media post — with guided, meaningful experiences
3. **Preserve memories** in a format that grows over time, not scattered across camera rolls
4. **Coordinate care** among family members, pet sitters, and veterinary teams
5. **Feel emotionally appropriate** — existing pet apps are utilitarian, not aspirational

Current market offerings are either too clinical (vet-focused), too generic (basic reminders), or too fragmented (separate apps for photos, health, tasks). PoshPet unifies these into a single premium experience.

---

## 3. Target Audience

### Primary Persona: "The Devoted Pet Parent"

| Attribute | Detail |
|---|---|
| **Age** | 28–45 |
| **Gender** | Primarily women (70%+) |
| **Geography** | United States (Phase 1) |
| **Income** | Middle to upper-middle ($60K–$150K household) |
| **Pets** | 1–3 pets, primarily dogs and cats |
| **Behavior** | Treats pets as family members; active on Instagram/TikTok with pet content |
| **Tech comfort** | High; uses 10+ apps daily; willing to pay for premium experiences |
| **Emotional driver** | Guilt about forgetting care tasks; desire to "do right" by their pet |

### Secondary Personas
- **Multi-pet households** managing complex care schedules
- **New pet parents** seeking guidance and community
- **Senior pet parents** wanting to preserve legacy and memories
- **Shared custody / co-parenting** pet situations

### Supported Species (14)
Dogs, Cats, Fish, Birds, Rabbits, Guinea Pigs, Hamsters, Ferrets, Chinchillas, Hedgehogs, Bearded Dragons, Leopard Geckos, Snakes, Turtles/Tortoises

---

## 4. Product Vision & Principles

### Design Principles

1. **Emotion First** — Every interaction should feel like an act of love, not a chore
2. **Invisible Intelligence** — AI powers features behind the scenes; never branded as "AI-powered"
3. **Celebration Over Obligation** — Streaks reward, never punish; missed days are handled gracefully
4. **Premium by Default** — Every screen, animation, and micro-interaction reflects luxury
5. **Species-Inclusive** — All 14 species treated as first-class citizens, not afterthoughts
6. **Privacy as Promise** — Pet data is sacred; no selling, no ads, no third-party data sharing

### The "Invisible AI" Philosophy
- 80% rule-based logic, 20% simple ML
- No "AI" labels visible to users anywhere
- AI powers: smart task scheduling, nudge timing, garden growth calculations, pacing engine
- Users experience magic, not technology

---

## 5. Business Model

### Pricing Tiers

| Feature | Free Tier | PoshPet Society (Premium) |
|---|---|---|
| **Price** | $0 | **$14.99/month** (7-day free trial) |
| **Pets** | 1 pet | Unlimited pets |
| **Party Kits** | Basic steps only | Full kits + Time Capsules + Voice/Video |
| **Care Circles** | — | Up to 8 members per circle |
| **Photo Storage** | 100 photos | Unlimited |
| **Custom Trackers** | 3 trackers | Unlimited (10 templates) |
| **Planner Themes** | Default only | 4 themes |
| **Export** | — | PDF/image export of memory pages |
| **Garden Decor** | Basic | Full unlock system |

### Revenue Streams (Phase 1)
1. **Subscriptions** — Primary revenue via PoshPet Society ($14.99/mo)
2. **Payment processing** — Stripe with standard fees

### Revenue Streams (Future Phases)
- Annual subscription discount
- One-time Party Kit purchases (à la carte)
- Premium garden decorations / avatar accessories
- Partnerships with pet brands
- Gift subscriptions

---

## 6. Feature Requirements

### F1: Daily Planner & Calendar (Central Hub)

**Priority:** P0 — Critical
**Tier:** Free (basic) / Premium (customization)

The planner is the app's home screen and primary daily touchpoint.

**Requirements:**
- Daily view as default with week/month navigation
- Task cards showing: pet avatar, task name, time (if set), streak count, completion toggle
- Quick-add floating action button for new tasks
- Pull-to-refresh with animated transition
- Overdue tasks highlighted with visual indicator
- Species-specific default task templates on pet creation
- Completion celebration: confetti burst on daily 100% completion
- Calendar dot indicators for days with tasks

**Customization (Premium):**
- 4 planner themes: Classic Posh (rose gold), Modern Minimal (grayscale), Botanical Garden (sage/cream), Midnight Luxe (deep navy/gold)
- Completion styles: checkmark, paw stamp, heart fill, star burst
- Task grouping: by pet, by time, by category

**Task Recurrence:**
- Daily, weekly (select days), monthly, custom interval
- Auto-generation via `task_instance_generation` cron job
- Instances created 7 days in advance

---

### F2: Care Garden Visualization

**Priority:** P0 — Critical
**Tier:** Free

A living visual metaphor where completing care tasks grows a garden unique to each pet.

**Requirements:**
- Species-specific garden icons for 6 species (Dog, Cat, Fish, Bird, Rabbit, Hamster); generic flower for remaining 8
- 3 garden states per element:
  - **Empty** (0% tasks) — bare soil/empty pot
  - **Growing** (1–99%) — sprouting with partial bloom
  - **Full Bloom** (100%) — fully flourished with particle effects
- State calculated from rolling 7-day task completion percentage
- "Full Bloom" celebration: one-time animation with haptic feedback when garden reaches 100%
- Garden resets gradually (not cliff-edge) — decay over 48 hours of inactivity
- Visual representation rendered client-side using completion data from API
- Garden decor unlocks (Premium): earned through streaks and milestones

**State Calculation:**
```
completion_rate = completed_tasks_7d / total_tasks_7d
state = empty (0%) | growing (1-99%) | full_bloom (100%)
```

**API Endpoint:** `GET /v1/garden/:petId/state`

---

### F3: Task Streak Badges

**Priority:** P0 — Critical
**Tier:** Free

Streaks reward consistency and are a primary engagement mechanic.

**Streak Tiers:**

| Tier | Days | Icon | Color |
|---|---|---|---|
| Sprout | 3 | 🌱 | Green |
| Bloom | 7 | 🌸 | Pink |
| Golden Paw | 30 | 🐾 | Gold |
| Platinum Heart | 90 | 💎 | Platinum |
| Royal Crown | 180 | 👑 | Purple |
| Diamond Paw | 365 | 💠 | Iridescent |

**Requirements:**
- Streaks tracked per-task (not global)
- Streak day = at least one task completed before midnight (user's local timezone)
- Skip system: 1 free skip per 30 consecutive days (banked, max 3)
- Skip auto-applied if day missed and skip available
- Streak-at-risk notification at 9 PM if no tasks completed
- Badge unlock animation: tier-specific with haptic
- Shareable badge images (PNG export with pet name + streak count)
- Streak history viewable per task

**Edge Cases:**
- Timezone changes: use device timezone at moment of completion
- Task deleted mid-streak: streak preserved on remaining tasks
- Pet removed: streaks archived, not deleted

---

### F4: Health Tracking

**Priority:** P1 — High
**Tier:** Free (basic) / Premium (advanced)

**Sub-features:**

#### F4a: Weight Tracker
- Manual weight entry with unit toggle (lbs/kg)
- Line chart visualization (last 12 months)
- Optional weight goal with progress indicator
- Trend indicator (gaining/losing/stable)

#### F4b: Vet Visit Log
- Date, clinic name, vet name, reason, notes, cost
- Document/photo attachment (vet records)
- Next visit reminder with notification
- Visit history timeline view

#### F4c: Medication Tracker
- Medication name, dosage, frequency, start/end dates
- Reminder notifications tied to planner
- Refill reminders (configurable days before end date)
- Active vs. completed medication status

**Critical Requirement — Medical Disclaimer:**
> Every health tracking screen MUST display: *"PoshPet is not a substitute for professional veterinary advice. Always consult your veterinarian for medical decisions."*
> This is a legal and App Store compliance requirement. No exceptions.

---

### F5: Custom Trackers

**Priority:** P1 — High
**Tier:** Free (3 max) / Premium (unlimited)

User-created trackers for any metric they want to monitor.

**10 Built-in Templates:**
1. Water intake (ml/oz)
2. Exercise duration (minutes)
3. Mood/behavior (emoji scale)
4. Appetite (1–5 scale)
5. Sleep quality (1–5 scale)
6. Grooming log (date + notes)
7. Training sessions (duration + notes)
8. Treats given (count)
9. Outdoor time (minutes)
10. Social interactions (count + notes)

**Requirements:**
- Custom name, icon selection, unit type, input type (number/scale/text/boolean)
- Chart visualization per tracker (line, bar, or calendar heat map — auto-selected by input type)
- Data export as CSV (Premium)
- Trackers pinnable to daily planner view

---

### F6: Photo Gallery & Media

**Priority:** P1 — High
**Tier:** Free (100 photos) / Premium (unlimited)

**Photo Processing Pipeline (3 versions per upload):**

| Version | Max Dimension | Quality | Use Case |
|---|---|---|---|
| Thumbnail | 200px | 60% | Grid view, lists |
| Standard | 800px | 80% | Detail view, timeline |
| Original | As uploaded | 95% | Full-screen, export |

**Requirements:**
- Upload from camera or photo library
- Auto-strip EXIF GPS data for privacy (preserve date/orientation)
- Caption and date fields (date defaults to EXIF or upload date)
- Tagging: pet, event, location (text, not GPS)
- Grid view with infinite scroll (20 photos per page)
- Full-screen viewer with swipe navigation
- Favorites system (heart toggle)
- Photo attached to timeline events automatically
- Storage: Cloudflare R2 or AWS S3 (`poshpet-media` bucket, private, signed URLs with 1-hour expiry)

**Upload Flow:**
1. Client compresses to max 5MB
2. Request signed upload URL from API
3. Upload directly to R2/S3
4. API processes into 3 versions via background job
5. Stores version URLs in `pet_photos` table

---

### F7: Interactive Pet Avatar

**Priority:** P1 — High
**Tier:** Free

A living avatar that reflects the pet's current care status.

**4 Mood States:**

| State | Trigger | Priority |
|---|---|---|
| **Sleeping** | 10 PM – 6 AM (user timezone) | Highest (10) |
| **Sad** | Any task overdue by 4+ hours | 8 |
| **Waiting** | Task due within next 2 hours | 5 |
| **Happy** | Default / all tasks complete | 1 (lowest) |

**Animation Implementation:**
- **Lottie animations** for top 4 species (Dog, Cat, Fish, Bird) — 4 states × 4 species = 16 animation files
- **Static illustrations** with CSS transitions for remaining 10 species
- Animations loop seamlessly; transitions between states use 300ms crossfade
- Avatar calculation runs every 5 minutes via cron, cached in Redis (TTL: 5 min)

**Avatar Placement:**
- Planner header (small, 48px)
- Pet profile (large, 200px)
- Garden view (medium, 96px, integrated into garden scene)

---

### F8: Pet Legacy Timeline

**Priority:** P1 — High
**Tier:** Free (view) / Premium (export)

An auto-generated, chronological story of the pet's life.

**Auto-captured Events:**
- Pet profile created ("Welcome to PoshPet!")
- First task completed
- Streak milestones (each tier)
- Garden Full Bloom achievements
- Party Kit completions
- Weight milestones
- Vet visits
- Photo uploads (grouped by day)
- Care Circle created/joined
- Custom milestones (user-added)

**Requirements:**
- Vertical scrollable timeline with date headers
- Event cards with icon, title, description, optional photo
- Filterable by event type
- Manual milestone addition (date, title, description, photo)
- Memorial mode: triggered when pet is marked as "passed"
  - Timeline header changes to memorial styling
  - "Rainbow Bridge" badge added
  - All data preserved permanently (excluded from retention cleanup)
  - Shareable memorial link (Premium)

---

### F9: Care Circles (Social)

**Priority:** P1 — High
**Tier:** Premium only

Private groups for coordinating pet care among trusted people.

**Requirements:**
- Max 8 members per circle
- Role-based access:
  - **Owner** — full control, can delete circle
  - **Admin** — manage members, assign tasks
  - **Caregiver** — complete tasks, add photos, view schedule
  - **Viewer** — read-only access
- Invite system: unique 8-character codes, 72-hour expiry, single-use
- Shared task assignment within circle
- Activity feed showing member actions
- Circle-specific photo sharing
- Member task completion notifications
- Circle owner can remove members or dissolve circle
- Expired invites cleaned up by `expired_invite_cleanup` cron job

**Moderation:**
- Content reporting system
- Owner/Admin can remove content
- Auto-flag system for prohibited content patterns
- Reported content quarantined pending review

---

### F10: Smart Notifications

**Priority:** P1 — High
**Tier:** Free (basic) / Premium (full control)

**10 Notification Types:**

| Type | Trigger | Default |
|---|---|---|
| `task_reminder` | Task due in 30 min | ON |
| `task_overdue` | Task 1 hour past due | ON |
| `streak_risk` | 9 PM, no tasks done today | ON |
| `streak_milestone` | New tier reached | ON |
| `garden_update` | State change | ON |
| `circle_activity` | Member action in circle | ON |
| `kit_step` | Next Party Kit step ready | ON |
| `capsule_delivery` | Time capsule unlock | ON |
| `health_reminder` | Vet/med reminder | ON |
| `weekly_digest` | Sunday 10 AM summary | OFF |

**Requirements:**
- Push notifications via Firebase Cloud Messaging (FCM)
- Per-type enable/disable toggles
- Quiet hours (default: 10 PM – 7 AM, configurable)
- Frequency limits: max 8 push notifications per day per user
- Digest mode (Premium): batch notifications into morning/evening summary
- Notification history viewable in-app (last 30 days)
- Deep-link each notification to relevant screen

---

### F11: Pet Selector & Multi-Pet Support

**Priority:** P0 — Critical
**Tier:** Free (1 pet) / Premium (unlimited)

**Requirements:**
- Horizontal scrollable pet selector bar at top of main screens
- Active pet context persists across navigation
- "All Pets" view for planner (interleaved tasks)
- Pet profile: name, species, breed, birthday, adoption date, photo, bio
- Pet creation wizard: 3 steps (species → details → photo)
- Quick-switch: tap avatar to change active pet (no page reload)
- Pet archive: soft-delete with 30-day recovery window
- Pet data isolation: each pet's data completely independent

---

### F12: Animated Transitions

**Priority:** P2 — Medium
**Tier:** Free

**Requirements:**
- All screen transitions: 300ms duration, ease-in-out curve
- Tab bar: crossfade between tabs
- Modal: slide-up with backdrop fade
- Task completion: checkmark animation → confetti burst (100% daily)
- Pull-to-refresh: custom branded animation (paw print spinner)
- Skeleton loading screens on all data-fetching views
- Target: 60fps on mid-range devices (2021+)
- Respect device "reduce motion" accessibility setting
- Animation library: Lottie for complex animations, React Native Reanimated for transitions

---

## 7. Party Kits (Core Differentiator)

Party Kits are PoshPet's flagship feature — guided, multi-step celebration experiences that turn pet milestones into cinematic memories.

### 7.1 Launch Kits (Phase 1)

#### Kit 1: Birthday Celebration (7 Steps)

| Step | Type | Content |
|---|---|---|
| 1 | `date_picker` | "When is [Pet]'s birthday?" |
| 2 | `yes_no` | "Do you know [Pet]'s exact birth date?" |
| 3 | `text_input` | "What's your favorite birthday memory with [Pet]?" |
| 4 | `single_choice` | "Pick [Pet]'s birthday theme" (Royal Ball / Garden Party / Adventure Day / Cozy Night In) |
| 5 | `photo_capture` | "Take a birthday portrait of [Pet]!" |
| 6 | `voice_video` | **Premium** — "Record a birthday message for [Pet]" (Time Capsule) |
| 7 | `circle_contribution` | **Premium** — "Invite your Care Circle to add birthday wishes" |

#### Kit 2: Adoption Anniversary (6 Steps)

| Step | Type | Content |
|---|---|---|
| 1 | `date_picker` | "When did [Pet] join your family?" |
| 2 | `text_input` | "Tell the story of how you met [Pet]" |
| 3 | `photo_capture` | "Share a photo from adoption day (or your earliest photo)" |
| 4 | `single_choice` | "How has [Pet] changed your life?" (choices vary) |
| 5 | `voice_video` | **Premium** — Record a message to future self |
| 6 | `circle_contribution` | **Premium** — Family messages about [Pet]'s adoption |

#### Kit 3: New Pet Welcome (6 Steps)

| Step | Type | Content |
|---|---|---|
| 1 | `date_picker` | "When is [Pet] arriving / When did [Pet] arrive?" |
| 2 | `text_input` | "How did you choose [Pet]'s name?" |
| 3 | `multi_choice` | "What are you most excited about?" |
| 4 | `photo_capture` | "First photo with [Pet]!" |
| 5 | `text_input` | "Write a welcome letter to [Pet]" |
| 6 | `voice_video` | **Premium** — "Record a welcome message" |

#### Kit 4: Senior Pet Comfort (6 Steps)

| Step | Type | Content |
|---|---|---|
| 1 | `single_choice` | "How is [Pet] doing these days?" (comfort assessment) |
| 2 | `text_input` | "What's [Pet]'s favorite comfort activity?" |
| 3 | `multi_choice` | "Select comfort care focuses" |
| 4 | `photo_capture` | "Capture a peaceful moment with [Pet]" |
| 5 | `text_input` | "Write a love letter to [Pet]" |
| 6 | `voice_video` | **Premium** — "Record a message for [Pet]'s time capsule" |

### 7.2 Time Capsules

Encrypted voice/video messages sealed during Party Kit completion, delivered exactly 1 year later.

**Requirements:**
- Voice: max 2 minutes, M4A format
- Video: max 1 minute, MP4 format, max 100MB
- Encryption: AES-256-GCM, per-capsule encryption key
- Storage: dedicated `poshpet-capsules` bucket (restricted access)
- Delivery: `time_capsule_delivery` cron checks daily at midnight UTC
- Unlock: push notification + in-app animation (wax seal breaking)
- Early release: immediate delivery if pet is marked as passed
- 12-month retention hook: capsule delivery re-engages lapsed users

### 7.3 Living Memory Pages

Beautiful, scrollable keepsake pages auto-generated from Kit completion data.

**Requirements:**
- Auto-composed from kit responses (text, photos, choices)
- Grows year-over-year (repeated kits add to same memory page)
- Exportable as PDF or shareable image (Premium)
- Unique URL for sharing (access-controlled)
- Template per kit type with branded design

### 7.4 Intelligent Pacing Engine

Steps are distributed over time leading up to the target date, not presented all at once.

**Pacing Rules:**
- Distribution begins 14 days before target date
- Steps spaced 2–3 days apart by default
- Adaptive behavior profiles:
  - **Eager (Fast):** Completes steps quickly → release next step sooner (min 1 day gap)
  - **Steady:** Follows default pacing
  - **Last-minute:** Hasn't started with 3 days to go → send gentle nudge, compress remaining steps
  - **Abandoned:** No activity for 7+ days → pause notifications, send re-engagement after 14 days
- Premium steps (voice_video, circle_contribution) can be skipped by free users with "Upgrade to unlock" prompt
- `kit_pacing_check` cron runs every 6 hours

### 7.5 Cinematic Completion

When all steps are done, users receive a premium completion experience.

**Requirements:**
- 8–10 second animation sequence
- Kit-specific hero animation (e.g., birthday cake with candles, adoption heart)
- Confetti/particle effects
- Emotional copy (e.g., "Another year of love, celebrated beautifully.")
- CTA: View Memory Page / Share / Start Another Kit
- Haptic feedback pattern: gentle build → celebration burst

---

## 8. User Stories

### Onboarding & Setup

| ID | Story | Priority |
|---|---|---|
| US-01 | As a new user, I can create an account with email or social login so I can get started quickly | P0 |
| US-02 | As a new user, I am guided through adding my first pet so the app feels personalized immediately | P0 |
| US-03 | As a new user, I see species-specific default tasks suggested so I don't start with an empty planner | P0 |
| US-04 | As a returning user, I can log in and find my data exactly as I left it | P0 |

### Daily Care

| ID | Story | Priority |
|---|---|---|
| US-10 | As a pet parent, I can view today's tasks for all my pets so I know what needs to be done | P0 |
| US-11 | As a pet parent, I can mark tasks complete with a satisfying animation so care feels rewarding | P0 |
| US-12 | As a pet parent, I can see my care garden grow as I complete tasks so I feel motivated | P0 |
| US-13 | As a pet parent, I can see my pet's avatar mood change based on care status so I feel connected | P1 |
| US-14 | As a pet parent, I can create recurring tasks so I don't have to re-enter daily routines | P0 |
| US-15 | As a pet parent, I can use a skip day without losing my streak so I don't feel punished for real life | P1 |

### Health & Tracking

| ID | Story | Priority |
|---|---|---|
| US-20 | As a pet parent, I can log my pet's weight over time and see trends | P1 |
| US-21 | As a pet parent, I can record vet visits with notes and reminders for follow-ups | P1 |
| US-22 | As a pet parent, I can track medications with refill reminders | P1 |
| US-23 | As a pet parent, I can create custom trackers for any metric I care about | P1 |

### Celebrations

| ID | Story | Priority |
|---|---|---|
| US-30 | As a pet parent, I can start a Birthday Kit and be guided through celebration steps over 2 weeks | P0 |
| US-31 | As a pet parent, I can record a voice message that becomes a time capsule delivered in 1 year | P1 |
| US-32 | As a pet parent, I can view a beautiful Memory Page of past celebrations that grows each year | P1 |
| US-33 | As a premium user, I can invite my Care Circle to contribute to a celebration kit | P1 |

### Social

| ID | Story | Priority |
|---|---|---|
| US-40 | As a premium user, I can create a Care Circle and invite up to 8 trusted people | P1 |
| US-41 | As a circle member, I can see and complete shared tasks for a pet I help care for | P1 |
| US-42 | As a circle owner, I can manage roles and remove members if needed | P1 |

### Memory & Legacy

| ID | Story | Priority |
|---|---|---|
| US-50 | As a pet parent, I can view a timeline of my pet's life events auto-captured by PoshPet | P1 |
| US-51 | As a pet parent, I can add custom milestones to my pet's timeline | P1 |
| US-52 | As a grieving pet parent, I can mark my pet as passed and see their timeline become a memorial | P2 |

---

## 9. Technical Architecture

### System Architecture

**Three-tier architecture:**

```
┌─────────────────────────────────────────────────┐
│                  CLIENT LAYER                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Mobile   │  │   Web    │  │    Admin     │  │
│  │React Native│ │React+Vite│  │  Panel (Web) │  │
│  │ 0.73+    │  │  18+     │  │              │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
└───────┼──────────────┼───────────────┼──────────┘
        │              │               │
        ▼              ▼               ▼
┌─────────────────────────────────────────────────┐
│                  API SERVER                      │
│         Node.js 20 LTS + Express 4.x            │
│         TypeScript + Prisma 5.x ORM             │
│         JWT Auth + Zod Validation                │
└──────────┬──────────────────┬───────────────────┘
           │                  │
           ▼                  ▼
┌─────────────────┐  ┌───────────────────────────┐
│    DATA LAYER   │  │     STORAGE / SERVICES     │
│  PostgreSQL 15+ │  │  Cloudflare R2 / AWS S3   │
│  (Supabase/     │  │  Redis (Upstash)           │
│   Railway)      │  │  Firebase Auth + FCM       │
│                 │  │  Stripe                     │
│                 │  │  Sentry                     │
│                 │  │  Mixpanel / Amplitude       │
└─────────────────┘  └───────────────────────────┘
```

### Tech Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Mobile | React Native | 0.73+ |
| Web | React + Vite | 18+ |
| API | Node.js + Express + TypeScript | Node 20 LTS, Express 4.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 15+ |
| Cache | Redis (Upstash) | — |
| Object Storage | Cloudflare R2 or AWS S3 | — |
| Auth | Firebase Authentication | — |
| Push Notifications | Firebase Cloud Messaging | — |
| Payments | Stripe | — |
| Error Tracking | Sentry | — |
| Analytics | Mixpanel or Amplitude | — |
| Animations | Lottie + React Native Reanimated | — |

### Key Architectural Decisions

1. **Prisma ORM over raw SQL** — Type-safe database access, auto-generated migrations, schema-first design
2. **Firebase Auth over custom auth** — Battle-tested, handles social login, reduces security surface area
3. **Cloudflare R2 over pure S3** — Zero egress fees for media-heavy app, S3-compatible API
4. **Redis for caching** — Avatar mood state, session data, rate limiting, garden calculations
5. **Monorepo structure** — Shared types between mobile, web, and API via TypeScript
6. **Zod for validation** — Runtime type checking at API boundaries, auto-generates OpenAPI docs

---

## 10. Database Design

### Domain Overview

**35 tables across 8 domains:**

| Domain | Tables | Key Entities |
|---|---|---|
| **Core** | 5 | users, user_settings, pets, pet_species_config, subscriptions |
| **Planner & Tasks** | 4 | tasks, task_instances, task_categories, planner_settings |
| **Progress & Achievements** | 4 | streaks, streak_history, garden_states, achievements |
| **Health Tracking** | 4 | weight_records, vet_visits, medications, custom_trackers |
| **Media & Timeline** | 4 | pet_photos, timeline_events, photo_tags, media_processing_queue |
| **Social / Care Circles** | 4 | care_circles, circle_members, circle_invites, circle_activity_log |
| **Party Kits** | 6 | party_kits, kit_instances, kit_steps, kit_step_responses, time_capsules, memory_pages |
| **Notifications** | 4 | notification_preferences, notification_queue, notification_log, device_tokens |

### Key Table Relationships

```
users (1) ──── (N) pets
  │                  │
  │                  ├── (N) tasks ──── (N) task_instances
  │                  ├── (N) streaks
  │                  ├── (N) garden_states
  │                  ├── (N) weight_records
  │                  ├── (N) vet_visits
  │                  ├── (N) medications
  │                  ├── (N) custom_trackers
  │                  ├── (N) pet_photos
  │                  ├── (N) timeline_events
  │                  └── (N) kit_instances ──── (N) kit_step_responses
  │                                        └── (N) time_capsules
  │                                        └── (1) memory_pages
  │
  ├── (1) user_settings
  ├── (1) subscriptions
  ├── (N) notification_preferences
  ├── (N) device_tokens
  └── (N) circle_members ──── (1) care_circles
```

### Data Retention & Lifecycle
- Active user data: retained indefinitely
- Deleted pet data: 30-day soft-delete recovery window, then hard-delete
- Memorial pets: permanently retained (excluded from cleanup)
- Time capsules: retained until delivered + 90 days
- Notification log: 30-day rolling retention
- Analytics events: 12-month retention
- Expired invites: cleaned up after 72 hours

---

## 11. API Design

### Conventions

- **Base URL:** `/v1`
- **Auth:** Bearer JWT in Authorization header
- **Pagination:** Offset-based (`?page=1&limit=20`, default limit 20, max 100)
- **Validation:** Zod schemas on all request bodies
- **Error format:**
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Pet not found",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/params failed Zod validation |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Entity doesn't exist or not owned by user |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

### Key API Endpoints (100+)

**Auth & Users:**
- `POST /v1/auth/register` — Create account
- `POST /v1/auth/login` — Login (returns JWT pair)
- `POST /v1/auth/refresh` — Refresh access token
- `GET /v1/users/me` — Get current user profile
- `PATCH /v1/users/me` — Update profile
- `PUT /v1/users/me/settings` — Update settings

**Pets:**
- `POST /v1/pets` — Create pet
- `GET /v1/pets` — List user's pets
- `GET /v1/pets/:id` — Get pet details
- `PATCH /v1/pets/:id` — Update pet
- `DELETE /v1/pets/:id` — Soft-delete pet
- `POST /v1/pets/:id/restore` — Restore deleted pet (within 30 days)

**Tasks & Planner:**
- `POST /v1/pets/:petId/tasks` — Create task
- `GET /v1/pets/:petId/tasks` — List tasks
- `PATCH /v1/tasks/:id` — Update task
- `DELETE /v1/tasks/:id` — Delete task
- `GET /v1/planner/daily?date=YYYY-MM-DD` — Get daily planner view
- `POST /v1/task-instances/:id/complete` — Mark task instance complete
- `POST /v1/task-instances/:id/skip` — Use a skip day

**Garden & Streaks:**
- `GET /v1/garden/:petId/state` — Get garden state
- `GET /v1/streaks/:petId` — Get all streaks for pet
- `GET /v1/streaks/:petId/:taskId` — Get specific task streak

**Health:**
- `POST /v1/pets/:petId/weight` — Log weight
- `GET /v1/pets/:petId/weight` — Get weight history
- `POST /v1/pets/:petId/vet-visits` — Log vet visit
- `POST /v1/pets/:petId/medications` — Add medication
- `POST /v1/pets/:petId/trackers` — Create custom tracker
- `POST /v1/trackers/:id/entries` — Log tracker entry

**Photos & Timeline:**
- `POST /v1/pets/:petId/photos/upload-url` — Get signed upload URL
- `POST /v1/pets/:petId/photos` — Register uploaded photo
- `GET /v1/pets/:petId/photos` — List photos (paginated)
- `GET /v1/pets/:petId/timeline` — Get timeline events

**Party Kits:**
- `GET /v1/kits` — List available kit templates
- `POST /v1/pets/:petId/kits/:kitId/start` — Start a kit instance
- `GET /v1/kit-instances/:id` — Get kit instance with progress
- `POST /v1/kit-instances/:id/steps/:stepId/respond` — Submit step response
- `GET /v1/kit-instances/:id/memory-page` — Get memory page

**Care Circles:**
- `POST /v1/circles` — Create circle
- `POST /v1/circles/:id/invite` — Generate invite code
- `POST /v1/circles/join` — Join via invite code
- `GET /v1/circles/:id/feed` — Get activity feed

**Notifications:**
- `GET /v1/notifications` — List notifications
- `PUT /v1/notifications/preferences` — Update preferences
- `POST /v1/device-tokens` — Register device for push

**Subscriptions:**
- `POST /v1/subscriptions/checkout` — Create Stripe checkout session
- `GET /v1/subscriptions/status` — Get subscription status
- `POST /v1/webhooks/stripe` — Stripe webhook handler

### Rate Limiting

| Endpoint Group | Limit |
|---|---|
| General API | 100 requests/minute |
| Auth endpoints | 5 requests/15 minutes |
| File uploads | 10 requests/minute |
| Webhook endpoints | No limit (validated by signature) |

---

## 12. Design System

### Brand Identity

| Element | Value |
|---|---|
| **Primary Color** | Rose Gold `#B76E79` |
| **Secondary Color** | Sage `#87A878` |
| **Accent** | Gold `#D4AF37` |
| **Background** | Cream `#FFF8F0` |
| **Text Primary** | Charcoal `#2D2D2D` |
| **Text Secondary** | Warm Gray `#6B6B6B` |
| **Error** | Soft Red `#C44D56` |
| **Success** | Sage Green `#87A878` |

### Typography

| Usage | Font | Weight | Size |
|---|---|---|---|
| Headlines | Playfair Display | Bold (700) | 24–32px |
| Body | Inter | Regular (400) | 14–16px |
| Captions | Inter | Medium (500) | 12px |
| Buttons | Inter | Semi-Bold (600) | 14–16px |

### Spacing & Layout
- Base unit: 4px
- Standard spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- Border radius: 8px (cards), 12px (buttons), 24px (modals), 999px (pills/avatars)
- Shadow levels: sm (cards), md (modals), lg (floating elements)

### Component Library (Key Components)
- `PoshButton` — Primary, Secondary, Ghost, Danger variants
- `PoshCard` — Elevated card with optional header/footer
- `PoshInput` — Text, Number, Date, Select with floating label
- `PoshAvatar` — Pet avatar with mood indicator ring
- `PoshBadge` — Streak badges with tier-specific styling
- `PoshModal` — Bottom sheet (mobile) / centered (web)
- `PoshToast` — Success/error/info notifications
- `PoshSkeleton` — Loading placeholders matching content shape

---

## 13. Security & Compliance

### Authentication & Authorization
- **Firebase Authentication** for identity management
- **JWT tokens:** 15-minute access token + 7-day refresh token
- **Password hashing:** bcrypt with 12 salt rounds
- **Admin access:** requires 2FA (TOTP)
- **API key rotation:** planned for future phases

### Data Protection
- **Transport:** TLS 1.3 for all connections
- **At rest:** AES-256-GCM encryption for time capsules; database encryption via provider (Supabase/Railway)
- **Photo privacy:** EXIF GPS data stripped on upload; signed URLs with 1-hour expiry
- **Secrets management:** 21 environment variables, never committed to source control

### Rate Limiting & Abuse Prevention
- IP-based + user-based rate limiting via Redis
- Account lockout after 5 failed login attempts (15-minute cooldown)
- Content reporting system in Care Circles
- Auto-flag prohibited content patterns

### Compliance Requirements

#### GDPR
- Right to access: `GET /v1/users/me/data-export`
- Right to deletion: `DELETE /v1/users/me` (full account + data purge within 30 days)
- Data portability: JSON export of all user data
- Consent tracking for marketing communications
- Privacy policy and cookie consent on web

#### CCPA
- "Do Not Sell My Information" link in settings
- Data collection disclosure
- Opt-out mechanism for data sharing (though PoshPet doesn't sell data)

#### App Store Compliance
- Apple: subscription disclosure in App Store listing, restore purchases button, no external payment links
- Google Play: subscription terms on sign-up, cancellation accessible within 2 taps

#### Medical Disclaimers
- **Required on every health-related screen:**
  > "PoshPet is not a substitute for professional veterinary advice. Always consult your veterinarian for medical decisions."
- Covers: weight tracker, vet visits, medications, custom health trackers
- **Non-negotiable** — blocks App Store approval without it

---

## 14. Infrastructure & Deployment

### Environment Architecture

| Environment | Purpose | Database | Deployment |
|---|---|---|---|
| **Development** | Local dev | Local PostgreSQL | `localhost:3000` |
| **Staging** | QA + testing | Staging DB (seeded) | Auto-deploy on `staging` branch |
| **Production** | Live users | Production DB (backed up) | Manual deploy from `main` with approval |

### Storage Buckets

| Bucket | Access | Content | Encryption |
|---|---|---|---|
| `poshpet-media` | Private (signed URLs) | Photos, documents | At rest |
| `poshpet-capsules` | Restricted | Time capsule audio/video | AES-256-GCM |
| `poshpet-static` | Public (CDN) | App assets, Lottie files | None |

### Cron Jobs (10)

| Job | Schedule | Purpose |
|---|---|---|
| `time_capsule_delivery` | Daily midnight UTC | Check & deliver unlocked capsules |
| `streak_reset_check` | Daily 1 AM UTC | Reset broken streaks, apply skips |
| `garden_state_reset` | Every 6 hours | Recalculate garden states |
| `task_instance_generation` | Daily 2 AM UTC | Generate task instances 7 days ahead |
| `notification_digest` | Sunday 10 AM user-tz | Compile weekly digest |
| `kit_pacing_check` | Every 6 hours | Release next kit steps based on pacing |
| `expired_invite_cleanup` | Daily 3 AM UTC | Remove expired circle invites |
| `photo_cleanup` | Daily 4 AM UTC | Remove orphaned media files |
| `analytics_snapshot` | Daily 5 AM UTC | Aggregate daily metrics |
| `backup_verification` | Daily 6 AM UTC | Verify database backup integrity |

### Environment Variables (21)

```
DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET,
FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_MONTHLY,
R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_MEDIA,
R2_BUCKET_CAPSULES, R2_BUCKET_STATIC, SENTRY_DSN,
MIXPANEL_TOKEN, ENCRYPTION_KEY, APP_URL, API_URL
```

### Deployment Checklist Categories
1. Database migrations & seed data
2. Environment variable verification
3. Firebase configuration
4. Stripe products & webhooks
5. Storage bucket creation & CORS
6. Cron job scheduling
7. Monitoring & alerting setup

---

## 15. Success Metrics

### North Star Metric
**Weekly Active Care Sessions** — Users who complete at least 1 care task per week

### Primary KPIs

| Metric | Target (3-month) | Target (12-month) |
|---|---|---|
| **MAU** (Monthly Active Users) | 10,000 | 100,000 |
| **DAU/MAU Ratio** | 30% | 40% |
| **Free → Premium Conversion** | 5% | 8% |
| **Premium Retention (monthly)** | 85% | 90% |
| **Party Kit Completion Rate** | 60% | 75% |
| **Average Revenue Per User (ARPU)** | $0.75 | $1.20 |

### Secondary KPIs

| Metric | Target |
|---|---|
| Daily task completion rate | 70%+ |
| Average streak length | 14+ days |
| Photos uploaded per user/month | 8+ |
| Care Circles created per premium user | 0.5+ |
| Time capsule creation rate (of eligible) | 40%+ |
| App Store rating | 4.7+ |
| Crash-free session rate | 99.5%+ |
| API p95 latency | < 200ms |

### Tracking Implementation
- **Product analytics:** Mixpanel or Amplitude
- **Error tracking:** Sentry (client + server)
- **Performance:** Custom metrics via analytics snapshot cron
- **Business metrics:** Stripe dashboard + custom admin panel

---

## 16. Phase 1 Scope & Exclusions

### In Scope (Phase 1)
- All 17 features described in this document
- 4 Party Kits (Birthday, Adoption Anniversary, New Pet Welcome, Senior Pet Comfort)
- iOS + Android mobile apps
- Web app (responsive)
- Admin panel (web)
- 14 species support
- US market (English only)
- Stripe payments (USD only)
- Free + Premium ($14.99/mo) tiers

### Explicitly Excluded from Phase 1

| Exclusion | Reason |
|---|---|
| Marketplace / e-commerce | Complexity; explore in Phase 3 |
| Vet integration / telehealth | Regulatory complexity; Phase 2+ |
| GPS/location tracking | Privacy concerns; needs careful design |
| Social feed / public profiles | Keeps Phase 1 focused on private experience |
| In-app messaging / chat | Care Circles activity feed sufficient for Phase 1 |
| AI-generated content (visible) | Conflicts with "Invisible AI" principle |
| Multi-language / i18n | US-only Phase 1; infrastructure for Phase 2 |
| Android Wear / Apple Watch | Phase 2 feature |
| Offline mode | Phase 2; requires significant sync architecture |
| Video calling | Out of scope |
| Pet health AI diagnosis | Liability risk; never planned |
| Breeding / genetics features | Not aligned with brand |
| Third-party API integrations | Phase 2 (Petco, Chewy, vet records) |
| Annual subscription plan | Phase 2 (after monthly pricing validated) |
| Gift subscriptions | Phase 2 |
| Referral program | Phase 2 |
| Advanced reporting / analytics for users | Phase 2 |
| Dark mode | Phase 2 (design system ready but not implemented) |

---

## 17. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Low free-to-premium conversion** | Medium | High | Strong free tier that demonstrates value; Party Kit previews tease premium; trial optimization |
| **High churn after trial** | Medium | High | Ensure "aha moment" within first 3 days; time capsule as 12-month retention hook |
| **App Store rejection (medical claims)** | Low | High | Medical disclaimers on ALL health screens; legal review before submission |
| **Content moderation in Care Circles** | Medium | Medium | Automated flagging + manual review; strict ToS; quick removal flow |
| **Performance on older devices** | Medium | Medium | 60fps target with fallbacks; "reduce motion" support; progressive loading |
| **Data breach / security incident** | Low | Critical | TLS 1.3, encryption at rest, regular security audits, penetration testing pre-launch |
| **Scope creep during development** | High | Medium | Strict Phase 1 exclusion list; feature freeze 4 weeks before launch |
| **Firebase vendor lock-in** | Low | Medium | Abstract auth layer; migration path to custom auth in Phase 2 if needed |
| **Time capsule delivery failure** | Low | High | Redundant cron with retry logic; admin alerts on delivery failure; manual delivery fallback |
| **Species-specific content gap** | Medium | Low | Core 6 species fully designed; remaining 8 use generic templates; community feedback drives prioritization |

---

## 18. Development Roadmap

### Phase 1 Development Sequence

#### Sprint 1–2: Foundation
- Project scaffolding (monorepo, CI/CD)
- Database schema + Prisma setup (all 35 tables)
- Authentication system (Firebase + JWT)
- User & pet CRUD APIs
- Basic React Native app shell + navigation

#### Sprint 3–4: Core Care Loop
- Daily planner + task management
- Task recurrence engine + cron jobs
- Streak tracking system
- Care garden visualization
- Pet avatar mood system

#### Sprint 5–6: Health & Tracking
- Weight tracker with charts
- Vet visit log
- Medication tracker with reminders
- Custom tracker engine (10 templates)
- Medical disclaimers implementation

#### Sprint 7–8: Media & Timeline
- Photo upload pipeline (3-version processing)
- Photo gallery with grid/full-screen views
- Pet Legacy Timeline (auto-capture + manual)
- Memorial mode

#### Sprint 9–10: Party Kits
- Kit engine (step types, responses, progress)
- 4 launch kits implementation
- Intelligent pacing engine
- Time capsule recording + encryption + delivery
- Living Memory Pages
- Cinematic completion animations

#### Sprint 11–12: Social & Premium
- Care Circles (creation, invites, roles, moderation)
- Stripe subscription integration
- Premium feature gating
- Smart notification system (all 10 types)
- Push notification infrastructure (FCM)

#### Sprint 13–14: Polish & Launch
- Animated transitions (60fps optimization)
- Planner customization (themes, completion styles)
- Admin panel
- Performance optimization
- Security audit + penetration testing
- App Store submission
- Deployment checklist execution

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **Care Garden** | Visual metaphor where task completion grows a species-specific garden |
| **Care Circle** | Private group of up to 8 people sharing pet care responsibilities |
| **Party Kit** | Guided, multi-step celebration experience for pet milestones |
| **Time Capsule** | Encrypted voice/video message sealed for 1 year |
| **Living Memory Page** | Auto-generated keepsake page from Party Kit responses |
| **Streak** | Consecutive days of task completion, tracked per-task |
| **Full Bloom** | Garden state achieved when 100% of tasks completed over 7 days |
| **PoshPet Society** | Premium subscription tier ($14.99/month) |
| **Invisible AI** | Design philosophy: AI powers features silently, never branded |
| **Cinematic Completion** | Premium animation experience when a Party Kit is finished |
| **Memorial Mode** | Timeline state activated when a pet is marked as passed |

## Appendix B: Species Support Matrix

| Species | Garden Icon | Lottie Avatar | Default Tasks | Party Kit Support |
|---|---|---|---|---|
| Dog | Custom | Yes (4 moods) | Walk, Feed, Water, Groom | All 4 kits |
| Cat | Custom | Yes (4 moods) | Feed, Water, Litter, Play | All 4 kits |
| Fish | Custom | Yes (4 moods) | Feed, Water Change, Tank Check | All 4 kits |
| Bird | Custom | Yes (4 moods) | Feed, Water, Cage Clean, Social | All 4 kits |
| Rabbit | Custom | Static + CSS | Feed, Water, Hay, Exercise | All 4 kits |
| Hamster | Custom | Static + CSS | Feed, Water, Bedding, Wheel | All 4 kits |
| Guinea Pig | Generic | Static + CSS | Feed, Water, Hay, Vitamin C | All 4 kits |
| Ferret | Generic | Static + CSS | Feed, Water, Play, Litter | All 4 kits |
| Chinchilla | Generic | Static + CSS | Feed, Water, Dust Bath, Hay | All 4 kits |
| Hedgehog | Generic | Static + CSS | Feed, Water, Bath, Wheel | All 4 kits |
| Bearded Dragon | Generic | Static + CSS | Feed, Water, UV Check, Mist | All 4 kits |
| Leopard Gecko | Generic | Static + CSS | Feed, Water, Mist, Tank Temp | All 4 kits |
| Snake | Generic | Static + CSS | Feed, Water, Tank Temp, Shed Check | All 4 kits |
| Turtle/Tortoise | Generic | Static + CSS | Feed, Water, UV Check, Shell Check | All 4 kits |

---

*This PRD is based on the PoshPet Phase 1 Technical Documentation v3.0 (February 2026). The Gemini conversation source was inaccessible due to authentication requirements and is not reflected in this document.*

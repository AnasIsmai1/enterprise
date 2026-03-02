# Phase 2: Identity & Payments - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can register, authenticate, manage their accounts, create and manage pets, and subscribe to premium. This is the complete identity and payment foundation that every subsequent feature depends on. Scope covers Better-Auth integration (email/password + Apple + Google), user profile management, pet CRUD with multi-pet support, and Stripe subscription billing.

</domain>

<decisions>
## Implementation Decisions

### Social Login & Account Linking
- Auto-merge accounts when a social provider (Apple/Google) email matches an existing email/password account — requires the social provider's email to be verified
- On first social sign-in (new account): pull name, email, and avatar URL from the provider to pre-populate the user profile — user can edit later
- Social-only users can set a password from account settings at any time, giving them email/password as a fallback login method
- Apple Sign-In relay emails (privaterelay.appleid.com) are accepted as-is — transactional emails go through Apple's relay, respecting user privacy

### Pet Onboarding Flow
- Pet creation is mandatory immediately after registration — the app is meaningless without a pet, so the backend should enforce at least one pet exists before granting full access
- Required fields at pet creation: name, species, birthday — breed and avatar photo are optional (can be added later)
- 14 supported species (stored as varchar, not PG enum): dog, cat, fish, bird, rabbit, guinea_pig, hamster, ferret, chinchilla, hedgehog, bearded_dragon, leopard_gecko, snake, turtle
- Backend tracks `active_pet_id` on the user record for cross-device consistency — API requests can scope to the active pet

### Subscription Lifecycle
- 7-day free trial for new premium subscribers (configured via Stripe's trial period feature)
- Payment failure handling: let Stripe's dunning process manage retries entirely — only downgrade the user when Stripe sends the `customer.subscription.deleted` webhook (no custom retry logic)
- Optimistic premium access: after Stripe Checkout completes and redirects back, treat the user as premium immediately — the webhook confirms shortly after, and a background reconciliation catches edge cases
- Seamless plan switching (monthly <-> annual) via Stripe Customer Portal — Stripe handles prorations automatically

### Downgrade & Deletion Behavior
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

</decisions>

<specifics>
## Specific Ideas

- Species stored as `varchar(30)` column with TypeScript union type (not PG enum) — allows future expansion without migrations
- The `active_pet_id` on the user record enables consistent pet context across devices and sessions
- Stripe Customer Portal handles plan management, reducing custom billing UI endpoints
- 7-day trial aligns with building the daily care habit (Phase 3 dependency) before asking for payment

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-identity-payments*
*Context gathered: 2026-03-02*

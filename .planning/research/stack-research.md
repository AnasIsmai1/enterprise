# Stack Research: PoshPet Backend API

**Researched:** 2026-03-02
**Stack:** NestJS 11 + TypeORM 0.3 + PostgreSQL 16 + Redis 7 + TypeScript 5.7
**Confidence:** MEDIUM (training data only -- no live doc verification available)

---

## 1. Boilerplate Assessment

The enterprise boilerplate from github.com/AnasIsmai1/enterprise provides a solid foundation. Here is what it gives us and what needs changing.

### What We Keep As-Is

| Component | Status | Notes |
|-----------|--------|-------|
| NestJS 11 + TypeScript 5.7 | Good | Latest stable versions |
| TypeORM 0.3.27 with PostgreSQL | Good | `autoLoadEntities: true` already configured |
| Redis via ioredis | Good | Global module, injected as `REDIS_CLIENT` |
| JWT auth with refresh tokens in Redis | Good | Rotation pattern already implemented correctly |
| CASL authorization factory | Good | Needs PoshPet-specific rules, but the pattern works |
| Docker Compose (Postgres 16 + Redis 7) | Good | Healthchecks already configured |
| Base entity with UUID PKs | Keep pattern, fix bug | `createdAt`/`updatedAt` decorators are swapped (line 9-10 in base.entity.ts) |
| Base repository with pagination | Good | Extend for PoshPet needs |
| Config validation via class-validator | Good | Extend with PoshPet-specific env vars |
| Response interceptor | Good | Standardized response envelope |
| Swagger integration | Good | Already configured |
| Path aliases `@/` and `@mod/` | Good | Clean imports |

### What Needs Modification

| Component | Issue | Action |
|-----------|-------|--------|
| `base.entity.ts` | `@CreateDateColumn()` is on `updatedAt` and `@UpdateDateColumn()` is on `createdAt` -- decorators are swapped | Swap the decorators. Also add `@DeleteDateColumn()` for soft delete support |
| `organizations` module | Not needed for PoshPet | Remove entirely. PoshPet has no org concept -- Care Circles are a separate domain |
| `user.entity.ts` | Minimal fields, org-centric roles | Extend for PoshPet profile (timezone, subscription tier, notification prefs, onboarding state) |
| Redis module | Raw ioredis only | Add a `CacheService` abstraction for typed get/set/invalidate with TTL management |
| `migrationsTableName` | Set to `enterprise_migrations` | Change to `poshpet_migrations` |
| `synchronize: !isProduction` | Dangerous in dev with 35 tables | Set to `false` always. Use migrations exclusively from day one |
| Docker container names | `enterprise_*` | Rename to `poshpet_*` |
| Brevo email service | Generic | Replace with notification-specific service (push via FCM + email via Brevo/Resend) |
| CASL factory | Org-based roles | Rewrite for PoshPet: user owns pets, circle membership roles, admin role |

### Critical Bug: BaseEntity Decorator Swap

```typescript
// CURRENT (BROKEN) - base.entity.ts lines 9-10
@CreateDateColumn()
updatedAt: Date;   // BUG: CreateDateColumn on updatedAt

@UpdateDateColumn()
createdAt: Date;   // BUG: UpdateDateColumn on createdAt
```

```typescript
// FIXED
@CreateDateColumn({ type: 'timestamptz' })
createdAt: Date;

@UpdateDateColumn({ type: 'timestamptz' })
updatedAt: Date;

@DeleteDateColumn({ type: 'timestamptz', nullable: true })
deletedAt?: Date;
```

Use `timestamptz` (TIMESTAMP WITH TIME ZONE) as specified in the project constraints.

---

## 2. Module Organization for 8 Domains

### Recommended Directory Structure

PoshPet has 35 tables across 8 domains. The boilerplate already uses a layered architecture per module (`application/core/infrastructure/presentation`). Extend this consistently.

```
src/
  app/
    app.module.ts                    # Root module -- imports all domain modules
    app.controller.ts
    health/
  modules/
    auth/                            # Authentication + authorization
      application/
        services/auth.service.ts
        dtos/
      core/
        entities/                    # user, user_role, role, permission
        interfaces/
      infrastructure/
        guards/
        strategies/
        factories/casl.factory.ts
        repositories/
      presentation/
        auth.module.ts
        controllers/
    pets/                            # Pet CRUD, species config, pet selector context
      application/
        services/pet.service.ts
        dtos/
      core/
        entities/                    # pet, pet_species_config
        interfaces/
      infrastructure/
        repositories/pet.repository.ts
      presentation/
        pets.module.ts
        controllers/
    planner/                         # Tasks, templates, instances, recurrence
      application/
        services/
          task-template.service.ts
          task-instance.service.ts
          planner.service.ts
        dtos/
      core/
        entities/                    # task_template, task_instance, planner_customization
        interfaces/
      infrastructure/
        repositories/
      presentation/
        planner.module.ts
        controllers/
    garden/                          # Care garden state, decor unlocks
      application/
        services/garden-state.service.ts
        dtos/
      core/
        entities/                    # garden_state, garden_decor, garden_decor_preference
      infrastructure/
        repositories/
      presentation/
        garden.module.ts
        controllers/
    streaks/                         # Streak tracking, badges, skips
      application/
        services/streak.service.ts
        dtos/
      core/
        entities/                    # task_streak, streak_badge, streak_skip
      infrastructure/
        repositories/
      presentation/
        streaks.module.ts
        controllers/
    health/                          # Weight, vet visits, medications, custom trackers
      application/
        services/
          weight.service.ts
          vet-visit.service.ts
          medication.service.ts
          custom-tracker.service.ts
        dtos/
      core/
        entities/                    # weight_log, vet_visit, medication, custom_tracker, tracker_entry
      infrastructure/
        repositories/
      presentation/
        health.module.ts
        controllers/
    photos/                          # Photo upload, processing, gallery
      application/
        services/photo.service.ts
        dtos/
      core/
        entities/                    # pet_photo
      infrastructure/
        repositories/
      presentation/
        photos.module.ts
        controllers/
    social/                          # Care Circles, posts, invites, reporting
      application/
        services/
          circle.service.ts
          circle-post.service.ts
          invite.service.ts
        dtos/
      core/
        entities/                    # care_circle, circle_member, circle_post, circle_invite, content_report
      infrastructure/
        repositories/
      presentation/
        social.module.ts
        controllers/
    party-kits/                      # Party kits, steps, time capsules, living memory pages
      application/
        services/
          kit.service.ts
          time-capsule.service.ts
          pacing.service.ts
        dtos/
      core/
        entities/                    # party_kit, kit_step, kit_progress, time_capsule, living_memory_page
      infrastructure/
        repositories/
      presentation/
        party-kits.module.ts
        controllers/
    subscriptions/                   # Stripe integration, webhook handling, tier checks
      application/
        services/subscription.service.ts
        dtos/
      core/
        entities/                    # subscription, payment_history
      infrastructure/
        repositories/
        webhooks/stripe-webhook.handler.ts
      presentation/
        subscriptions.module.ts
        controllers/
    notifications/                   # Push notifications, preferences, digests
      application/
        services/notification.service.ts
        dtos/
      core/
        entities/                    # notification, notification_preference
      infrastructure/
        repositories/
        providers/fcm.provider.ts
      presentation/
        notifications.module.ts
        controllers/
    timeline/                        # Pet Legacy Timeline, memorial mode
      application/
        services/timeline.service.ts
        dtos/
      core/
        entities/                    # timeline_event
      infrastructure/
        repositories/
      presentation/
        timeline.module.ts
        controllers/
    admin/                           # Admin panel API, moderation queue, analytics
      application/
        services/admin.service.ts
        dtos/
      core/
        entities/                    # analytics_snapshot, moderation_action
      infrastructure/
        repositories/
      presentation/
        admin.module.ts
        controllers/
  jobs/                              # All cron jobs in one place
    jobs.module.ts
    streak-reset.job.ts
    garden-state.job.ts
    task-generation.job.ts
    capsule-delivery.job.ts
    notification-digest.job.ts
    kit-pacing.job.ts
    invite-cleanup.job.ts
    photo-cleanup.job.ts
    analytics-snapshot.job.ts
    backup-verification.job.ts
  external/                          # Third-party integrations
    redis/redis.module.ts
    email/
    storage/                         # Cloudflare R2 / S3 client
      storage.module.ts
      storage.service.ts
    stripe/
      stripe.module.ts
      stripe.service.ts
    firebase/
      firebase.module.ts
      fcm.service.ts
  shared/                            # Cross-cutting concerns
    config/
    decorators/
    domain/
      base.entity.ts
      base.repository.ts
      interfaces/
    filters/                         # Global exception filters
    guards/
    interceptors/
    middleware/
    pipes/
    providers/
    types/
    utils/
    shared.module.ts
```

### Module Dependency Rules

Enforce these boundaries to prevent spaghetti:

1. **Modules never import each other's repositories directly.** Use exported services.
2. **Cross-domain communication goes through service injection**, not entity imports.
3. **The `shared/` folder is for truly generic utilities** -- if something is domain-specific, it belongs in that domain's module.
4. **The `jobs/` folder imports services from domain modules** but domain modules never import from `jobs/`.
5. **`external/` modules are `@Global()`** so any module can inject them without explicit imports.

### Module Registration in AppModule

```typescript
@Module({
  imports: [
    // Infrastructure (global)
    ConfigModule.forRoot({ ... }),
    TypeOrmModule.forRootAsync({ ... }),
    ScheduleModule.forRoot(),  // NEW: enables cron jobs
    RedisModule,
    EmailModule,
    StorageModule,
    StripeModule,
    FirebaseModule,

    // Domain modules
    AuthModule,
    PetsModule,
    PlannerModule,
    GardenModule,
    StreaksModule,
    HealthModule,
    PhotosModule,
    SocialModule,
    PartyKitsModule,
    SubscriptionsModule,
    NotificationsModule,
    TimelineModule,
    AdminModule,

    // Jobs (imports domain services)
    JobsModule,

    // Shared
    SharedModule,
    HealthCheckModule,
  ],
})
export class AppModule {}
```

---

## 3. TypeORM Repository Pattern with NestJS DI

### The Boilerplate Pattern (Keep It)

The boilerplate uses the "custom repository extending Repository" pattern. This is the correct approach for TypeORM 0.3+ with NestJS. Here is why and how to use it properly.

**Why this pattern works:** TypeORM 0.3 removed the `@EntityRepository()` decorator. The boilerplate correctly works around this by:
1. Extending `Repository<T>` (via `BaseRepository<T>`)
2. Injecting the native `Repository<T>` via `@InjectRepository()` in the constructor
3. Calling `super(repo.target, repo.manager, repo.queryRunner)` to initialize

This gives you full Repository API plus custom methods, properly integrated with NestJS DI.

### Base Repository Enhancement

Extend the base repository for PoshPet's common needs:

```typescript
import {
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
  DeepPartial,
  FindOptionsWhere,
} from 'typeorm';

export class BaseRepository<T extends ObjectLiteral & { id: string }>
  extends Repository<T>
{
  async findById(id: string, relations?: string[]): Promise<T | null> {
    return this.findOne({
      where: { id } as FindOptionsWhere<T>,
      relations,
    });
  }

  async findByIdOrFail(id: string, relations?: string[]): Promise<T> {
    const entity = await this.findById(id, relations);
    if (!entity) {
      throw new NotFoundException(`${this.metadata.name} not found`);
    }
    return entity;
  }

  async createEntity(data: DeepPartial<T>): Promise<T> {
    const entity = this.create(data);
    return this.save(entity);
  }

  async updateEntity(id: string, data: DeepPartial<T>): Promise<T> {
    await this.update(id, data as any);
    return this.findByIdOrFail(id);
  }

  async softRemove(id: string): Promise<void> {
    await this.softDelete(id);
  }

  /**
   * Offset-based pagination matching PoshPet API convention.
   * Returns { items, total, page, limit, totalPages }.
   */
  async paginate(
    qb: SelectQueryBuilder<T>,
    options: { page?: number; limit?: number },
  ): Promise<PaginationResult<T>> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find all entities belonging to a specific pet.
   * Most PoshPet tables have a `petId` column.
   */
  async findByPetId(petId: string): Promise<T[]> {
    return this.find({
      where: { petId } as FindOptionsWhere<T>,
    });
  }
}
```

### Domain Repository Example: StreakRepository

```typescript
@Injectable()
export class StreakRepository extends BaseRepository<TaskStreak> {
  constructor(
    @InjectRepository(TaskStreak)
    repo: Repository<TaskStreak>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findActiveStreakForTask(
    petId: string,
    taskTemplateId: string,
  ): Promise<TaskStreak | null> {
    return this.findOne({
      where: {
        petId,
        taskTemplateId,
        isActive: true,
      },
    });
  }

  async findStreaksAtRisk(cutoffDate: Date): Promise<TaskStreak[]> {
    return this.createQueryBuilder('streak')
      .where('streak.isActive = :active', { active: true })
      .andWhere('streak.lastCompletedAt < :cutoff', { cutoff: cutoffDate })
      .getMany();
  }

  async bulkResetStreaks(streakIds: string[]): Promise<void> {
    if (streakIds.length === 0) return;
    await this.createQueryBuilder()
      .update(TaskStreak)
      .set({ currentCount: 0, isActive: false })
      .whereInIds(streakIds)
      .execute();
  }
}
```

### Transaction Pattern

For operations spanning multiple repositories (e.g., completing a task updates streak, garden, and timeline):

```typescript
@Injectable()
export class TaskCompletionService {
  constructor(
    private dataSource: DataSource,
    private streakService: StreakService,
    private gardenService: GardenStateService,
    private timelineService: TimelineService,
  ) {}

  async completeTask(userId: string, taskInstanceId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // All operations within the same transaction
      const taskRepo = manager.getRepository(TaskInstance);
      const task = await taskRepo.findOneOrFail({
        where: { id: taskInstanceId },
      });

      task.completedAt = new Date();
      task.completedBy = userId;
      await taskRepo.save(task);

      // These services accept EntityManager for transactional work
      await this.streakService.incrementStreak(task.petId, task.templateId, manager);
      await this.gardenService.recalculate(task.petId, manager);
      await this.timelineService.addEvent(task.petId, 'task_completed', task, manager);
    });
  }
}
```

**Key insight:** Inject `DataSource` (not `EntityManager`) for transactions. Create a transaction via `dataSource.transaction()` and pass the transactional `EntityManager` to service methods that need to participate. This is the TypeORM 0.3 way.

### Entity Relationships: PetId as the Central Foreign Key

Most PoshPet tables relate to a pet. Establish a consistent pattern:

```typescript
// Mixin for pet-owned entities
export abstract class PetOwnedEntity extends BaseEntity {
  @Column('uuid')
  @Index()
  petId: string;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'petId' })
  pet: Pet;
}

// Usage
@Entity('task_streaks')
export class TaskStreak extends PetOwnedEntity {
  @Column('uuid')
  taskTemplateId: string;

  @Column('int', { default: 0 })
  currentCount: number;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('timestamptz', { nullable: true })
  lastCompletedAt: Date | null;
}
```

### TypeORM Performance Tips for 35 Tables

1. **Always use `autoLoadEntities: true`** (already configured). Never list entities manually in the root config.
2. **Use `TypeOrmModule.forFeature([...])` per module** with only that module's entities. The boilerplate already does this correctly.
3. **Avoid eager loading globally.** Use `relations` parameter per-query or `@RelationId` for foreign key access without joins.
4. **Index all foreign keys explicitly.** TypeORM only auto-indexes `@ManyToOne` with `@JoinColumn`, not bare `@Column('uuid')` used as FKs.
5. **Use query builder for complex reads**, `repository.save()` for simple writes.

---

## 4. Redis Caching Patterns

### Current State: Raw ioredis

The boilerplate provides raw `ioredis` via `@Inject('REDIS_CLIENT')`. This works but needs a typed abstraction layer for PoshPet's multiple cache use cases.

### Recommended: CacheService Abstraction

Do NOT use NestJS `@nestjs/cache-manager`. It adds unnecessary abstraction over what is already a simple key-value store. The boilerplate's direct ioredis approach is better for PoshPet's specific needs. Build a thin typed wrapper instead.

```typescript
@Injectable()
export class CacheService {
  constructor(
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    // Use SCAN instead of KEYS in production
    const stream = this.redis.scanStream({ match: pattern, count: 100 });
    const pipeline = this.redis.pipeline();
    let count = 0;

    return new Promise((resolve, reject) => {
      stream.on('data', (keys: string[]) => {
        keys.forEach((key) => {
          pipeline.del(key);
          count++;
        });
      });
      stream.on('end', async () => {
        if (count > 0) await pipeline.exec();
        resolve();
      });
      stream.on('error', reject);
    });
  }

  /**
   * Cache-aside pattern: return cached or compute + cache.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
```

### PoshPet Cache Key Schema

Use a consistent namespace convention. Every key should be predictable and invalidatable.

```typescript
// Cache key constants
export const CacheKeys = {
  // Garden state: recalculated every 6 hours, invalidated on task completion
  gardenState: (petId: string) => `garden:${petId}:state`,
  GARDEN_TTL: 6 * 60 * 60, // 6 hours

  // Avatar mood: recalculated every 5 minutes
  avatarMood: (petId: string) => `avatar:${petId}:mood`,
  AVATAR_TTL: 5 * 60, // 5 minutes

  // Streak data: invalidated on task completion or reset
  streakData: (petId: string, templateId: string) =>
    `streak:${petId}:${templateId}`,
  STREAK_TTL: 60 * 60, // 1 hour

  // User subscription tier: invalidated on Stripe webhook
  subscriptionTier: (userId: string) => `sub:${userId}:tier`,
  SUB_TTL: 60 * 60, // 1 hour

  // Refresh tokens (already in boilerplate)
  refreshToken: (userId: string, jti: string) => `rt:${userId}:${jti}`,

  // Rate limiting
  rateLimit: (userId: string, endpoint: string) =>
    `rl:${userId}:${endpoint}`,

  // Daily task completion count (for garden calculation)
  dailyCompletion: (petId: string, date: string) =>
    `daily:${petId}:${date}:completed`,
  DAILY_TTL: 48 * 60 * 60, // 48 hours (covers garden's 7-day window)

  // Pet list for a user (invalidated on pet add/remove)
  userPets: (userId: string) => `user:${userId}:pets`,
  USER_PETS_TTL: 30 * 60, // 30 minutes
} as const;
```

### Garden State Caching Pattern

The garden state is the most complex computed cache -- it depends on 7 days of task completion data.

```typescript
@Injectable()
export class GardenStateService {
  constructor(
    private cacheService: CacheService,
    private taskInstanceRepo: TaskInstanceRepository,
  ) {}

  async getGardenState(petId: string): Promise<GardenStateDto> {
    return this.cacheService.getOrSet(
      CacheKeys.gardenState(petId),
      CacheKeys.GARDEN_TTL,
      () => this.calculateGardenState(petId),
    );
  }

  private async calculateGardenState(petId: string): Promise<GardenStateDto> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { total, completed } = await this.taskInstanceRepo
      .createQueryBuilder('ti')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(ti.completedAt)', 'completed')
      .where('ti.petId = :petId', { petId })
      .andWhere('ti.scheduledDate >= :since', { since: sevenDaysAgo })
      .getRawOne();

    const rate = total > 0 ? completed / total : 0;
    const state = rate === 0 ? 'empty' : rate < 1 ? 'growing' : 'full_bloom';

    return { petId, completionRate: rate, state, calculatedAt: new Date() };
  }

  /**
   * Called after task completion to eagerly invalidate stale cache.
   */
  async invalidateForPet(petId: string): Promise<void> {
    await this.cacheService.del(CacheKeys.gardenState(petId));
  }
}
```

### Avatar Mood Caching Pattern

Priority-based calculation with short TTL.

```typescript
@Injectable()
export class AvatarMoodService {
  constructor(
    private cacheService: CacheService,
    private taskInstanceRepo: TaskInstanceRepository,
  ) {}

  async getMood(petId: string, userTimezone: string): Promise<AvatarMoodDto> {
    return this.cacheService.getOrSet(
      CacheKeys.avatarMood(petId),
      CacheKeys.AVATAR_TTL,
      () => this.calculateMood(petId, userTimezone),
    );
  }

  private async calculateMood(
    petId: string,
    userTimezone: string,
  ): Promise<AvatarMoodDto> {
    const now = new Date();
    const userHour = this.getHourInTimezone(now, userTimezone);

    // Priority 10: Sleeping (10 PM - 6 AM user timezone)
    if (userHour >= 22 || userHour < 6) {
      return { petId, mood: 'sleeping', priority: 10 };
    }

    // Priority 8: Sad (any task overdue by 4+ hours)
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const overdueCount = await this.taskInstanceRepo.count({
      where: {
        petId,
        scheduledDate: LessThan(fourHoursAgo),
        completedAt: IsNull(),
      },
    });
    if (overdueCount > 0) {
      return { petId, mood: 'sad', priority: 8 };
    }

    // Priority 5: Waiting (task due within 2 hours)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const upcomingCount = await this.taskInstanceRepo.count({
      where: {
        petId,
        scheduledDate: Between(now, twoHoursFromNow),
        completedAt: IsNull(),
      },
    });
    if (upcomingCount > 0) {
      return { petId, mood: 'waiting', priority: 5 };
    }

    // Priority 1: Happy (default)
    return { petId, mood: 'happy', priority: 1 };
  }

  private getHourInTimezone(date: Date, timezone: string): number {
    return parseInt(
      date.toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }),
      10,
    );
  }
}
```

### Cache Invalidation Strategy

| Event | Invalidate |
|-------|-----------|
| Task completed | `garden:{petId}:state`, `avatar:{petId}:mood`, `streak:{petId}:{templateId}`, `daily:{petId}:{date}:completed` |
| Pet added/removed | `user:{userId}:pets` |
| Subscription changed (Stripe webhook) | `sub:{userId}:tier` |
| Streak reset (cron) | `streak:{petId}:*` |
| Garden recalculation (cron) | `garden:{petId}:state` |
| User logout | `rt:{userId}:*` (already handled by boilerplate) |

**Rule:** Invalidate eagerly on writes. Let the cache-aside pattern (`getOrSet`) repopulate on next read. Do NOT try to update cache in place -- it creates consistency bugs.

---

## 5. Cron Job Patterns with @nestjs/schedule

### Installation

```bash
npm install @nestjs/schedule
```

The `@nestjs/schedule` package wraps `cron` (node-cron). It provides decorators for declarative scheduling and `SchedulerRegistry` for dynamic job management.

### Setup

```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... other modules
    JobsModule,
  ],
})
export class AppModule {}
```

### Jobs Module Structure

Keep all cron jobs in a dedicated `jobs/` directory. Each job is a thin orchestrator that calls domain services.

```typescript
// src/jobs/jobs.module.ts
@Module({
  imports: [
    // Import domain modules whose services the jobs need
    PlannerModule,
    StreaksModule,
    GardenModule,
    PartyKitsModule,
    NotificationsModule,
    SocialModule,
    PhotosModule,
    AdminModule,
  ],
  providers: [
    StreakResetJob,
    GardenStateJob,
    TaskGenerationJob,
    CapsuleDeliveryJob,
    NotificationDigestJob,
    KitPacingJob,
    InviteCleanupJob,
    PhotoCleanupJob,
    AnalyticsSnapshotJob,
    BackupVerificationJob,
  ],
})
export class JobsModule {}
```

### Job Implementation Pattern

Each job follows the same pattern: a `@Cron()` decorated method that logs start/end, catches errors, and delegates to domain services.

```typescript
@Injectable()
export class StreakResetJob {
  private readonly logger = new Logger(StreakResetJob.name);

  constructor(private streakService: StreakService) {}

  @Cron('0 1 * * *', {
    name: 'streak-reset-check',
    timeZone: 'UTC',
  })
  async handleStreakReset(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Starting streak reset check');

    try {
      const result = await this.streakService.processStreakResets();
      this.logger.log(
        `Streak reset complete: ${result.reset} reset, ${result.skipped} skip-applied ` +
        `(${Date.now() - startTime}ms)`,
      );
    } catch (error) {
      this.logger.error('Streak reset failed', error.stack);
      // In production: send alert to admin/Sentry
    }
  }
}
```

### All 10 Cron Job Specifications

```typescript
// Cron expressions for all PoshPet jobs
export const CRON_SCHEDULES = {
  // Daily jobs (staggered to avoid resource contention)
  TIME_CAPSULE_DELIVERY: '0 0 * * *',    // Midnight UTC
  STREAK_RESET:          '0 1 * * *',    // 1 AM UTC
  TASK_GENERATION:       '0 2 * * *',    // 2 AM UTC
  INVITE_CLEANUP:        '0 3 * * *',    // 3 AM UTC
  PHOTO_CLEANUP:         '0 4 * * *',    // 4 AM UTC
  ANALYTICS_SNAPSHOT:    '0 5 * * *',    // 5 AM UTC
  BACKUP_VERIFICATION:   '0 6 * * *',    // 6 AM UTC

  // Periodic jobs
  GARDEN_STATE_RESET:    '0 */6 * * *',  // Every 6 hours
  KIT_PACING_CHECK:      '0 */6 * * *',  // Every 6 hours (offset by 30 min? or same)

  // Weekly
  NOTIFICATION_DIGEST:   '0 10 * * 0',   // Sunday 10 AM UTC (user-tz handled in logic)
} as const;
```

### Handling User Timezones in Cron Jobs

The notification digest needs to run at 10 AM in each user's timezone. The clean approach: run the cron at a fixed UTC interval and filter users whose local time matches.

```typescript
@Injectable()
export class NotificationDigestJob {
  private readonly logger = new Logger(NotificationDigestJob.name);

  constructor(
    private notificationService: NotificationService,
    private userRepository: UserRepository,
  ) {}

  // Run every hour, process users whose local time is 10 AM
  @Cron('0 * * * *', {
    name: 'notification-digest',
    timeZone: 'UTC',
  })
  async handleDigest(): Promise<void> {
    const now = new Date();
    const targetHour = 10; // 10 AM local time
    const targetDay = 0;   // Sunday

    // Find timezones where it's currently Sunday 10 AM
    const eligibleTimezones = this.getTimezonesAtHourAndDay(now, targetHour, targetDay);

    if (eligibleTimezones.length === 0) return;

    const users = await this.userRepository
      .createQueryBuilder('u')
      .where('u.timezone IN (:...tzs)', { tzs: eligibleTimezones })
      .andWhere('u.digestEnabled = :enabled', { enabled: true })
      .getMany();

    for (const user of users) {
      try {
        await this.notificationService.sendWeeklyDigest(user);
      } catch (error) {
        this.logger.error(`Digest failed for user ${user.id}`, error.stack);
      }
    }
  }

  private getTimezonesAtHourAndDay(now: Date, hour: number, day: number): string[] {
    // Pre-computed list of IANA timezones
    // Filter to those where current local hour === target and day === target
    return Intl.supportedValuesOf('timeZone').filter((tz) => {
      try {
        const options = { timeZone: tz, hour: 'numeric' as const, hour12: false, weekday: 'short' as const };
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
        const localHour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '-1', 10);
        const localDay = parts.find(p => p.type === 'weekday')?.value;
        return localHour === hour && localDay === 'Sun';
      } catch {
        return false;
      }
    });
  }
}
```

### Cron Job Resilience

1. **Idempotency:** Every job must be safe to re-run. Use database state (timestamps, flags) to determine what needs processing, not in-memory state.
2. **Batch processing:** Process records in batches (100-500 at a time) to avoid memory issues with large datasets.
3. **Error isolation:** One failed record should not abort the entire job. Catch per-record and log failures.
4. **Distributed locking:** If you ever scale to multiple instances, use Redis `SET NX EX` for distributed locks:

```typescript
async acquireLock(jobName: string, ttlSeconds: number): Promise<boolean> {
  const result = await this.redis.set(
    `lock:job:${jobName}`,
    process.pid.toString(),
    'EX', ttlSeconds,
    'NX',
  );
  return result === 'OK';
}
```

For now with a solo founder and single instance, this is future-proofing. Do NOT add distributed locking complexity in Phase 1. Just document that jobs assume single-instance deployment.

---

## 6. Multi-Pet Context Switching

PoshPet is not truly multi-tenant, but it has a similar pattern: one user owns multiple pets, and most API operations are scoped to a specific pet.

### Pattern: Pet Context via Route Parameter

```
GET  /v1/pets/:petId/tasks
POST /v1/pets/:petId/tasks
GET  /v1/pets/:petId/garden/state
GET  /v1/pets/:petId/streaks
GET  /v1/pets/:petId/photos
```

### Pet Ownership Guard

Every pet-scoped endpoint must verify that the authenticated user actually owns the pet. Create a reusable guard.

```typescript
@Injectable()
export class PetOwnerGuard implements CanActivate {
  constructor(private petService: PetService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    const petId = request.params.petId;

    if (!petId) return true; // Not a pet-scoped route

    const pet = await this.petService.findByIdAndOwner(petId, userId);
    if (!pet) {
      throw new ForbiddenException('You do not own this pet');
    }

    // Attach pet to request for downstream use
    request.pet = pet;
    return true;
  }
}
```

### Pet Context Decorator

Extract the pet from the request cleanly:

```typescript
export const CurrentPet = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.pet; // Set by PetOwnerGuard
  },
);

// Usage in controller
@Get('garden/state')
@UseGuards(JwtGuard, PetOwnerGuard)
async getGardenState(@CurrentPet() pet: Pet): Promise<GardenStateDto> {
  return this.gardenService.getGardenState(pet.id);
}
```

### "All Pets" View

The planner supports an "All Pets" view with interleaved tasks. Handle this with a separate endpoint, not a special petId value.

```
GET /v1/planner/today          -- all pets for current user
GET /v1/pets/:petId/planner    -- single pet planner
```

### Subscription Tier Enforcement

Premium features (unlimited pets, circles, photos) need tier checking. Use a guard:

```typescript
@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    const tier = await this.subscriptionService.getTier(userId);

    if (tier !== 'premium') {
      throw new ForbiddenException('This feature requires PoshPet Society membership');
    }
    return true;
  }
}

// Usage: stack guards
@Post()
@UseGuards(JwtGuard, PremiumGuard)
async createCircle(@CurrentUser() user: User, @Body() dto: CreateCircleDto) {
  return this.circleService.create(user.id, dto);
}
```

For tiered limits (e.g., 1 pet free, unlimited premium), check in the service layer rather than a guard -- guards are boolean yes/no, but limit checks need context.

---

## 7. Clean Architecture / Layered Architecture

### The Boilerplate's Layer Convention

```
module/
  application/     -- Use cases, DTOs, service orchestration
    services/      -- Business logic
    dtos/          -- Request/response shapes
  core/            -- Domain model (entities, interfaces, value objects)
    entities/      -- TypeORM entities
    interfaces/    -- Repository interfaces, domain contracts
  infrastructure/  -- External concerns (DB, cache, external APIs)
    repositories/  -- TypeORM repository implementations
    providers/     -- External service adapters
  presentation/    -- HTTP layer (controllers, module definition)
    controllers/
    module.ts
```

### Rules for Each Layer

**Core (entities + interfaces):**
- No imports from application, infrastructure, or presentation
- No NestJS decorators except TypeORM entity decorators
- Defines interfaces that infrastructure implements
- This is the only layer other layers can depend on

**Application (services + DTOs):**
- Imports from core (entities, interfaces)
- Contains business logic and orchestration
- DTOs define API contract shapes (with class-validator decorators)
- Services are `@Injectable()` and injected into controllers
- Services call repository interfaces, not concrete implementations

**Infrastructure (repositories + providers):**
- Implements interfaces defined in core
- Contains TypeORM-specific code, Redis calls, external API clients
- Services in application layer receive these via NestJS DI

**Presentation (controllers + module):**
- Module definition wires everything together
- Controllers handle HTTP concerns (request parsing, response formatting, guards)
- Controllers delegate to application services immediately -- no business logic in controllers

### Practical Example: Task Completion Flow

```
Controller (presentation)
  -> validates request, extracts petId + taskId
  -> calls TaskCompletionService.complete(userId, petId, taskId)

TaskCompletionService (application)
  -> opens transaction via DataSource
  -> calls TaskInstanceRepository.markComplete(taskId)
  -> calls StreakService.incrementStreak(petId, templateId)
  -> calls GardenCacheService.invalidate(petId)
  -> calls TimelineEventService.record(petId, 'task_completed', ...)
  -> returns completion result

Controller (presentation)
  -> formats response with ResponseInterceptor
```

### DTO Patterns

Use separate DTOs for create, update, and response. Use `class-validator` decorators for input validation and `class-transformer` for response shaping.

```typescript
// Create DTO
export class CreatePetDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @IsEnum(PetSpecies)
  species: PetSpecies;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  breed?: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsDateString()
  adoptionDate?: string;
}

// Response DTO (use class-transformer @Expose/@Exclude)
export class PetResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  species: PetSpecies;

  @Expose()
  breed?: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  @Transform(({ value }) => value?.toISOString())
  createdAt: string;

  // Exclude internal fields automatically via ClassSerializerInterceptor
}
```

---

## 8. NestJS 11 Specific Patterns

### What Changed in NestJS 11

NestJS 11 (released late 2024) is a mostly backward-compatible upgrade. The boilerplate already uses NestJS 11 packages. Key relevant points:

| Feature | Impact on PoshPet |
|---------|------------------|
| Express v5 support | The boilerplate uses `@nestjs/platform-express` 11 which supports Express 5. No action needed. |
| Improved TypeScript 5.x support | Already using TS 5.7. `emitDecoratorMetadata` and `experimentalDecorators` still required for TypeORM + class-validator. |
| `@nestjs/typeorm` v11 | Aligned with TypeORM 0.3.x. No API changes from v10. |
| `@nestjs/swagger` v11 | CLI plugin improvements. Already configured in boilerplate. |
| `@nestjs/jwt` v11 | No breaking changes from v10. |

### NestJS 11 Best Practices to Follow

1. **Use `@nestjs/config` with typed configuration.** The boilerplate already does this with `ConfigService.get<string>('database.host')`. Enhance with a typed config namespace:

```typescript
// typed-config.ts
export interface AppConfig {
  port: number;
  env: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  // ...
}

// Register as namespaced config
export default registerAs('app', (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '5500', 10),
  env: process.env.NODE_ENV ?? 'development',
}));

// Inject typed
constructor(
  @Inject(appConfig.KEY)
  private config: ConfigType<typeof appConfig>,
) {
  console.log(this.config.port); // typed as number
}
```

2. **Use `@nestjs/swagger` CLI plugin** for automatic DTO documentation. Add to `nest-cli.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

This auto-generates Swagger docs from class-validator decorators and JSDoc comments, eliminating manual `@ApiProperty()` annotations.

3. **Use `ValidationPipe` globally** with `transform: true`:

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

This strips unknown properties (security), transforms types (convenience), and validates all inputs.

---

## 9. Additional Stack Recommendations

### Packages to Add

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@nestjs/schedule` | ^5.0 | Cron jobs | Required for the 10 scheduled jobs |
| `@nestjs/throttler` | ^6.0 | Rate limiting | 100 req/min general, 5/15min auth, 10/min uploads |
| `@nestjs/event-emitter` | ^3.0 | Domain events | Decouple cross-domain side effects (task complete -> update streak, garden, timeline) |
| `stripe` | ^17.0 | Stripe SDK | Subscription management + webhooks |
| `sharp` | ^0.33 | Image processing | Photo pipeline: 3-size generation, EXIF stripping |
| `@aws-sdk/client-s3` | ^3.x | R2/S3 storage | Cloudflare R2 is S3-compatible |
| `@aws-sdk/s3-request-presigner` | ^3.x | Signed URLs | 1-hour expiry signed upload/download URLs |
| `firebase-admin` | ^13.0 | FCM push | Push notifications via Firebase Cloud Messaging |
| `@nestjs/bull` or `bullmq` | latest | Background jobs | Photo processing pipeline, email sending |
| `luxon` | ^3.x | Timezone handling | User timezone calculations for notifications, streaks, avatar mood |

### Packages NOT to Add

| Package | Why Not |
|---------|---------|
| `@nestjs/cache-manager` | Overkill. Direct ioredis with typed wrapper is simpler and more controllable |
| `prisma` | TypeORM is already chosen and integrated. Switching adds no value and breaks boilerplate patterns |
| `drizzle` | Same as Prisma -- TypeORM is committed |
| `passport-google/apple` | Handle OAuth via the auth provider (Better-Auth or Clerk) decision, not raw Passport strategies |
| `nestjs-cls` | AsyncLocalStorage for request context. Nice-to-have but adds complexity for solo founder. Pass userId/petId explicitly instead |
| `@nestjs/microservices` | Overkill for a monolith. PoshPet is a single deployable unit |

### Event-Driven Side Effects with @nestjs/event-emitter

Task completion triggers updates in 4+ domains (streaks, garden, timeline, notifications). Rather than having the task service call all of them directly (tight coupling), use domain events.

```typescript
// Event definition
export class TaskCompletedEvent {
  constructor(
    public readonly userId: string,
    public readonly petId: string,
    public readonly taskInstanceId: string,
    public readonly taskTemplateId: string,
    public readonly completedAt: Date,
  ) {}
}

// Emitter (in TaskService)
@Injectable()
export class TaskInstanceService {
  constructor(private eventEmitter: EventEmitter2) {}

  async completeTask(userId: string, taskInstanceId: string): Promise<void> {
    // ... mark task complete in DB ...

    this.eventEmitter.emit(
      'task.completed',
      new TaskCompletedEvent(userId, task.petId, task.id, task.templateId, new Date()),
    );
  }
}

// Listeners (in their own domain modules)
@Injectable()
export class StreakEventListener {
  constructor(private streakService: StreakService) {}

  @OnEvent('task.completed')
  async handleTaskCompleted(event: TaskCompletedEvent): Promise<void> {
    await this.streakService.incrementStreak(event.petId, event.taskTemplateId);
  }
}

@Injectable()
export class GardenEventListener {
  constructor(private gardenService: GardenStateService) {}

  @OnEvent('task.completed')
  async handleTaskCompleted(event: TaskCompletedEvent): Promise<void> {
    await this.gardenService.invalidateForPet(event.petId);
  }
}
```

**Caveat:** `@nestjs/event-emitter` events are in-process and synchronous by default. For task completion, this is fine -- all listeners run within the same request. If a listener fails, the error propagates. For fire-and-forget (notifications), use `{ async: true }` option or a proper queue (BullMQ).

### Background Job Processing with BullMQ

For operations that should not block the HTTP response (photo processing, email sending, push notifications), use BullMQ.

```typescript
// Photo processing queue
@Injectable()
export class PhotoProcessor {
  constructor(
    @InjectQueue('photo-processing') private photoQueue: Queue,
  ) {}

  async queuePhotoProcessing(photoId: string, originalUrl: string): Promise<void> {
    await this.photoQueue.add('process', {
      photoId,
      originalUrl,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}

@Processor('photo-processing')
export class PhotoConsumer {
  @Process('process')
  async processPhoto(job: Job<{ photoId: string; originalUrl: string }>): Promise<void> {
    // 1. Download original from R2
    // 2. Generate thumbnail (200px, 60% quality) with sharp
    // 3. Generate standard (800px, 80% quality) with sharp
    // 4. Strip EXIF GPS data, preserve date/orientation
    // 5. Upload 3 versions to R2
    // 6. Update pet_photos table with URLs
  }
}
```

BullMQ requires Redis (already available). It provides retry logic, dead letter queues, and job progress tracking -- all important for the photo pipeline.

### Rate Limiting with @nestjs/throttler

```typescript
// app.module.ts
ThrottlerModule.forRoot([
  {
    name: 'general',
    ttl: 60000,    // 1 minute window
    limit: 100,    // 100 requests per minute
  },
]),

// Auth-specific (override per-controller)
@Controller('auth')
@Throttle({ general: { ttl: 15 * 60 * 1000, limit: 5 } }) // 5 per 15 min
export class AuthController { ... }

// Upload-specific
@Controller('pets/:petId/photos')
@Throttle({ general: { ttl: 60000, limit: 10 } }) // 10 per minute
export class PhotosController { ... }
```

---

## 10. Database Schema Patterns

### Base Entity (Fixed)

```typescript
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

export abstract class SoftDeletableEntity extends BaseEntity {
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

Use `SoftDeletableEntity` for: users (14-day grace), pets (30-day recovery), circle posts (moderation). Use plain `BaseEntity` for everything else.

### Enum Pattern

Use TypeScript enums + PostgreSQL `enum` type for small, stable sets. Use a `varchar` column for values that might change (like species -- you might add more).

```typescript
// Good: stable, small set
export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

@Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
status: TaskStatus;

// Good: potentially expanding set -- use varchar with TypeScript union
export type PetSpecies =
  | 'dog' | 'cat' | 'fish' | 'bird' | 'rabbit'
  | 'guinea_pig' | 'hamster' | 'ferret' | 'chinchilla'
  | 'hedgehog' | 'bearded_dragon' | 'leopard_gecko'
  | 'snake' | 'turtle';

@Column('varchar', { length: 30 })
species: PetSpecies;
```

### Index Strategy for 35 Tables

```typescript
// Composite indexes for common query patterns
@Entity('task_instances')
@Index(['petId', 'scheduledDate'])              // Planner view: tasks for pet on date
@Index(['petId', 'completedAt'])                // Garden calculation: completed tasks in window
@Index(['scheduledDate', 'completedAt'])         // Cron: find overdue tasks
export class TaskInstance extends BaseEntity { ... }

@Entity('task_streaks')
@Index(['petId', 'taskTemplateId', 'isActive'])  // Active streak lookup
export class TaskStreak extends BaseEntity { ... }

@Entity('timeline_events')
@Index(['petId', 'eventDate'])                   // Timeline view: chronological per pet
@Index(['petId', 'eventType'])                   // Timeline filter by type
export class TimelineEvent extends BaseEntity { ... }
```

### Migration Discipline

TypeORM `synchronize: true` is already dangerous with 8 tables. With 35, it will cause data loss. Enforce this:

1. **Set `synchronize: false` in ALL environments** (dev, staging, production).
2. **Generate migrations**: `npm run db:migration:generate -- CreatePetEntity`
3. **Review generated SQL** before running. TypeORM migration generator sometimes makes odd choices with enums and indexes.
4. **Run migrations**: `npm run db:migration:run`
5. **Never edit a migration after it has been run.** Create a new migration to alter.

---

## 11. Testing Strategy

### Unit Tests: Service Layer

Mock repositories with `jest.fn()`. The boilerplate has test files but they are mostly stubs.

```typescript
describe('StreakService', () => {
  let service: StreakService;
  let streakRepo: jest.Mocked<StreakRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StreakService,
        {
          provide: StreakRepository,
          useValue: {
            findActiveStreakForTask: jest.fn(),
            save: jest.fn(),
            bulkResetStreaks: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(StreakService);
    streakRepo = module.get(StreakRepository);
  });

  it('should increment streak count on task completion', async () => {
    streakRepo.findActiveStreakForTask.mockResolvedValue({
      id: 'streak-1',
      currentCount: 5,
      isActive: true,
    } as TaskStreak);

    await service.incrementStreak('pet-1', 'template-1');

    expect(streakRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ currentCount: 6 }),
    );
  });
});
```

### E2E Tests: API Endpoints

Use `supertest` with a real database (Docker test container).

```typescript
describe('Planner (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  it('/v1/pets/:petId/planner/today (GET)', () => {
    return request(app.getHttpServer())
      .get('/v1/pets/test-pet-id/planner/today')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeInstanceOf(Array);
      });
  });
});
```

---

## 12. Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Boilerplate assessment | HIGH | Based on direct code inspection of every file in the project |
| TypeORM repository pattern | HIGH | TypeORM 0.3 custom repo pattern is well-established; code verified in boilerplate |
| NestJS module organization | HIGH | Standard NestJS patterns; 8-12 modules is a normal scale for NestJS |
| Redis caching patterns | MEDIUM | Patterns are standard ioredis usage; specific TTLs/keys are PoshPet-specific recommendations |
| @nestjs/schedule cron | MEDIUM | Based on training data for @nestjs/schedule v4-5; API is stable but v5 specifics unverified |
| NestJS 11 specifics | MEDIUM | NestJS 11 was released within training window but could not verify latest changelog |
| BullMQ integration | MEDIUM | Standard NestJS pattern; version compatibility with NestJS 11 not live-verified |
| Event emitter pattern | MEDIUM | @nestjs/event-emitter is stable; pattern is standard |
| Rate limiting (@nestjs/throttler) | MEDIUM | API may have changed in v6; pattern is correct conceptually |

### Gaps Requiring Phase-Specific Research

- **Better-Auth vs Clerk decision**: Not researched here. Needs its own comparison research with live API testing.
- **Stripe webhook patterns**: Need to verify NestJS-specific Stripe webhook signature validation patterns.
- **Sharp + R2 integration**: Photo processing pipeline needs benchmarking with actual image sizes.
- **Firebase Admin SDK + NestJS**: FCM push notification patterns need verification.
- **BullMQ vs @nestjs/bull**: Need to verify which is the current recommended approach for NestJS 11.

---

## Sources

All findings based on:
- Direct inspection of the enterprise boilerplate code in this repository
- Training data knowledge of NestJS (v8-11), TypeORM (v0.3.x), ioredis, and associated ecosystem (training cutoff: May 2025)
- No live documentation was available for verification (WebSearch and WebFetch were unavailable)

Flag: All recommendations marked MEDIUM confidence should be verified against current official docs before implementation.

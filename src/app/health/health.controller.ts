import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { RedisHealthIndicator } from '@/common/indicators/redis-health.indicator';
import { Public } from '@/modules/auth/public.decorator';

/**
 * Health checks — INFRA-03.
 *
 * GET /health   — liveness + dependencies (database, redis, heap, disk)
 * GET /health/live — liveness only, no dependency calls
 *
 * The split matters for orchestrators: a liveness probe that fails because
 * Postgres is briefly unreachable gets the container killed and restarted,
 * which does not fix Postgres. Only readiness should depend on downstreams.
 *
 * @SkipThrottle() — health checks must not be rate-limited.
 * @Public() — probes and load balancers have no session.
 */
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly config: ConfigService
  ) {}

  @Get()
  @HealthCheck()
  @SkipThrottle() // API-10: Don't rate-limit health checks
  check() {
    // 512MB default, not 150MB: a NestJS process with TypeORM, BullMQ, the AWS
    // SDK and Sentry loaded sits well above 150MB at rest, so the old ceiling
    // reported "unhealthy" on a perfectly healthy process.
    const heapLimitMb = this.config.get<number>('health.heapLimitMb', 512);
    const diskThreshold = this.config.get<number>('health.diskThreshold', 0.9);

    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
      () => this.memory.checkHeap('memory_heap', heapLimitMb * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: diskThreshold,
        }),
    ]);
  }

  /** Liveness: the process is up and serving. No dependency calls. */
  @Get('live')
  @SkipThrottle()
  live() {
    return { status: 'ok' };
  }
}

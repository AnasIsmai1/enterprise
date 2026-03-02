import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { RedisHealthIndicator } from '@/common/indicators/redis-health.indicator';

/**
 * Health check controller — INFRA-03.
 *
 * Endpoint: GET /health
 * Checks: Postgres, Redis, memory heap, and disk storage.
 *
 * @SkipThrottle() — health checks must not be rate-limited.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @SkipThrottle() // API-10: Don't rate-limit health checks
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB heap limit
      () =>
        this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }), // 90% disk limit
    ]);
  }
}

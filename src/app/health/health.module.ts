import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from '@/common/indicators/redis-health.indicator';

/**
 * Health check module using @nestjs/terminus.
 *
 * Provides /health endpoint with Postgres, Redis, disk, and memory indicators.
 * RedisModule is @Global() so REDIS_CLIENT is available without explicit import here.
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule { }

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@/external/redis/redis.module';
import { StorageService } from './storage.service';

@Global()
@Module({
    imports: [ConfigModule, RedisModule],
    providers: [StorageService],
    exports: [StorageService],
})
export class StorageModule {}

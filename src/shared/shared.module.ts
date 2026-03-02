import { Module } from '@nestjs/common';
import { DatabaseLogger } from './providers/database-logger/database-logger';

@Module({
    imports: [],
    providers: [DatabaseLogger],
    exports: [DatabaseLogger]
})
export class SharedModule { }

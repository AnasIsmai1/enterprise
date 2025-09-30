import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseLogger implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DatabaseLogger.name);

    constructor(
        private readonly dataSource: DataSource,
    ) { }

    async onModuleInit() {
        const connName = this.dataSource.options.database || this.dataSource.options.type || 'default';
        if (this.dataSource.isInitialized) {
            this.logger.warn(`Database connection "${connName}" is already initialized.`);
            return;
        }

        try {
            await this.dataSource.initialize();
            this.logger.log(`Database "${connName}" connected!`, DatabaseLogger.name);
        } catch (err) {
            this.logger.error(
                `Database "${connName}" connection error: ${err.message}`,
                err.stack,
                DatabaseLogger.name
            );
        }
    }

    async onModuleDestroy() {
        const connName = this.dataSource.options.database || this.dataSource.options.type || 'default';
        if (this.dataSource.isInitialized) {
            try {
                await this.dataSource.destroy();
                this.logger.log(`Database "${connName}" disconnected gracefully.`, DatabaseLogger.name);
            } catch (err) {
                this.logger.error(
                    `Database "${connName}" disconnect error: ${err.message}`,
                    err.stack,
                    DatabaseLogger.name
                );
            }
        }
    }
}

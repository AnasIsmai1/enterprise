import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

/** `database` may be a Uint8Array for some drivers; coerce for logging only. */
function connectionName(dataSource: DataSource): string {
  const { database, type } = dataSource.options;

  if (typeof database === 'string' && database) return database;
  return type || 'default';
}

function describe(error: unknown): { message: string; stack?: string } {
  return error instanceof Error
    ? { message: error.message, stack: error.stack }
    : { message: String(error) };
}

@Injectable()
export class DatabaseLogger implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseLogger.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    const name = connectionName(this.dataSource);

    if (this.dataSource.isInitialized) {
      this.logger.warn(`Database connection "${name}" is already initialized.`);
      return;
    }

    try {
      await this.dataSource.initialize();
      this.logger.log(`Database "${name}" connected!`, DatabaseLogger.name);
    } catch (error) {
      const { message, stack } = describe(error);
      this.logger.error(
        `Database "${name}" connection error: ${message}`,
        stack,
        DatabaseLogger.name
      );
    }
  }

  async onModuleDestroy() {
    if (!this.dataSource.isInitialized) return;

    const name = connectionName(this.dataSource);

    try {
      await this.dataSource.destroy();
      this.logger.log(
        `Database "${name}" disconnected gracefully.`,
        DatabaseLogger.name
      );
    } catch (error) {
      const { message, stack } = describe(error);
      this.logger.error(
        `Database "${name}" disconnect error: ${message}`,
        stack,
        DatabaseLogger.name
      );
    }
  }
}

import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
    constructor(private readonly dataSource: DataSource) { }

    @Get('status')
    async getHealth() {
        try {
            await this.dataSource.query('SELECT 1');
            return {
                status: 'healthy',
                db: 'up'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                db: 'down',
                error: error.message
            };
        }
    }
}

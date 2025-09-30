import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';

describe('HealthController', () => {
    let controller: HealthController;
    let dataSourceMock: { query: jest.Mock };

    beforeEach(async () => {
        dataSourceMock = { query: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: DataSource,
                    useValue: dataSourceMock,
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
    });

    it('should return healthy status when DB is up', async () => {
        dataSourceMock.query.mockResolvedValueOnce([1]);
        const result = await controller.getHealth();
        expect(result).toEqual({
            status: 'healthy',
            db: 'up',
        });
    });

    it('should return unhealthy status when DB is down', async () => {
        dataSourceMock.query.mockRejectedValueOnce(new Error('DB error'));
        const result = await controller.getHealth();
        expect(result).toEqual({
            status: 'unhealthy',
            db: 'down',
            error: 'DB error',
        });
    });
})

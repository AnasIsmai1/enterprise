import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { DatabaseLogger } from './database-logger';

describe('DatabaseLogger', () => {
  let provider: DatabaseLogger;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseLogger,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    provider = module.get<DatabaseLogger>(DatabaseLogger);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});

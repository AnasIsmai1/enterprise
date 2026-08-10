import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app/app.module';

/**
 * Requires Postgres and Redis to be reachable (see docker-compose.dev.yaml) —
 * AppModule opens real connections. These are integration tests, not unit tests.
 *
 * Covers the guard wiring only. The better-auth routes are NOT reachable here:
 * they are mounted on the raw Express instance in main.ts, which
 * Test.createNestApplication() does not run. Exercise those against a booted
 * server.
 *
 * Runs with NODE_OPTIONS=--experimental-vm-modules (see the test:e2e script) —
 * AppModule dynamically imports better-auth, which is ESM, and jest's VM cannot
 * do that otherwise.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / is @Public() and returns the status string', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('API is running!');
  });

  it('GET /health is @Public() and reports every dependency', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    const body = res.body as {
      info?: Record<string, { status: string }>;
      error?: Record<string, { status: string }>;
    };

    // 503 here means an indicator is down, not that auth blocked the request —
    // the assertion below names which one.
    expect(body.info ?? body.error).toMatchObject({
      database: { status: 'up' },
      redis: { status: 'up' },
      memory_heap: { status: 'up' },
      disk: { status: 'up' },
    });
    expect(res.status).toBe(200);
  });

  it('GET /health/live needs no dependencies', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('an unknown route under the app prefix is 404, not 500', () => {
    return request(app.getHttpServer()).get('/does-not-exist').expect(404);
  });
});

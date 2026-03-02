import { RequestLoggerMiddleware } from './logging.middleware';

describe('LoggingMiddleware', () => {
    it('should be defined', () => {
        expect(new RequestLoggerMiddleware()).toBeDefined();
    });
});

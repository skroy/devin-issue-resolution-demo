describe('JWT_SECRET validation', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('throws error when JWT_SECRET is not set in production', () => {
        delete process.env.JWT_SECRET;
        process.env.NODE_ENV = 'production';

        expect(() => {
            require('../src/api/middleware/auth');
        }).toThrow('JWT_SECRET environment variable must be set in production');
    });

    test('does not throw when JWT_SECRET is set in production', () => {
        process.env.JWT_SECRET = 'my-secure-secret';
        process.env.NODE_ENV = 'production';

        expect(() => {
            require('../src/api/middleware/auth');
        }).not.toThrow();
    });

    test('does not throw when JWT_SECRET is not set in development', () => {
        delete process.env.JWT_SECRET;
        process.env.NODE_ENV = 'development';

        expect(() => {
            require('../src/api/middleware/auth');
        }).not.toThrow();
    });

    test('does not throw when JWT_SECRET is not set and NODE_ENV is not set', () => {
        delete process.env.JWT_SECRET;
        delete process.env.NODE_ENV;

        expect(() => {
            require('../src/api/middleware/auth');
        }).not.toThrow();
    });
});

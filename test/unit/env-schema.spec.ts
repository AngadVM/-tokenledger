import { validateEnv } from '../../src/config/env-schema';

const validEnv = {
  DATABASE_URL: 'postgresql://tokenledger:tokenledger@localhost:5432/tokenledger?schema=public',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'a-very-long-secret-for-testing-only',
  ADMIN_EMAIL: 'admin@tokenledger.dev',
  ADMIN_PASSWORD: 'admin-password-123',
  UPSTREAM_BASE_URL: 'http://localhost:11434/v1',
  UPSTREAM_API_KEY: 'dummy',
};

describe('validateEnv', () => {
  it('applies defaults for optional fields', () => {
    const config = validateEnv(validEnv);
    expect(config.PORT).toBe(3000);
    expect(config.NODE_ENV).toBe('development');
  });

  it('respects provided values', () => {
    const config = validateEnv({ ...validEnv, PORT: '4000', NODE_ENV: 'production' });
    expect(config.PORT).toBe(4000);
    expect(config.NODE_ENV).toBe('production');
  });

  it('throws when DATABASE_URL is missing', () => {
    const rest: Record<string, unknown> = { ...validEnv };
    delete rest.DATABASE_URL;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('throws on a non-numeric PORT', () => {
    expect(() => validateEnv({ ...validEnv, PORT: 'not-a-number' })).toThrow(/PORT/);
  });

  it('throws on a JWT_SECRET that is too short', () => {
    expect(() => validateEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('throws on an invalid ADMIN_EMAIL', () => {
    expect(() => validateEnv({ ...validEnv, ADMIN_EMAIL: 'not-an-email' })).toThrow(/ADMIN_EMAIL/);
  });

  it('throws on an invalid UPSTREAM_BASE_URL', () => {
    expect(() => validateEnv({ ...validEnv, UPSTREAM_BASE_URL: 'not-a-url' })).toThrow(
      /UPSTREAM_BASE_URL/,
    );
  });
});
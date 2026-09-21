import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.string().min(8).required(),
  UPSTREAM_BASE_URL: Joi.string().uri().required(),
  UPSTREAM_API_KEY: Joi.string().required(),
});

export type EnvConfig = {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  UPSTREAM_BASE_URL: string;
  UPSTREAM_API_KEY: string;
};

export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const { error, value } = envValidationSchema.validate(raw, {
    allowUnknown: true,
    abortEarly: false,
  });
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
  return value as EnvConfig;
}
import { z } from 'zod';

/**
 * Validates environment variables at startup.
 * Import this from anywhere that needs env vars; never use process.env directly.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);

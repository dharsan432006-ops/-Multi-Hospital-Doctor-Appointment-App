import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PORT: z.coerce.number().default(4000),
  API_PORT: z.coerce.number().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(7),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  ENCRYPTION_KEY: z.string().min(1, 'ENCRYPTION_KEY required (base64, 32 bytes)'),
  PREV_ENCRYPTION_KEY: z.string().optional().default(''),
  CANCELLATION_CUTOFF_HOURS: z.coerce.number().default(2),
  NOTIFICATION_PROVIDER: z.enum(['console', 'sendgrid', 'twilio', 'all']).default('console'),
  SENDGRID_API_KEY: z.string().optional().default(''),
  SENDGRID_FROM_EMAIL: z.string().default('no-reply@example.test'),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_FROM_NUMBER: z.string().default('+911800000000'),
  // OpenRouter (AI) — optional; AI routes return 503 when key is missing.
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_MODEL: z.string().default('meta-llama/llama-3.1-8b-instruct:free'),
  OPENROUTER_SITE_URL: z.string().default('http://localhost:5173'),
  OPENROUTER_APP_NAME: z.string().default('Bangalore Hospital Appointments'),
  AI_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
  AI_MAX_INPUT_CHARS: z.coerce.number().default(1000),
});

export type AppConfig = z.infer<typeof EnvSchema> & {
  port: number;
  corsOrigins: string[];
  jwtAccessTtlSeconds: number;
};

function parseTtlToSeconds(ttl: string): number {
  const m = ttl.match(/^(\d+)(s|m|h|d)$/);
  if (!m) return 15 * 60;
  const n = Number(m[1]);
  const unit = m[2];
  if (unit === 's') return n;
  if (unit === 'm') return n * 60;
  if (unit === 'h') return n * 3600;
  return n * 86400;
}

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment config: ${JSON.stringify(details)}`);
  }
  const env = parsed.data;
  const port = env.PORT ?? env.API_PORT ?? 4000;
  cached = {
    ...env,
    port,
    corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    jwtAccessTtlSeconds: parseTtlToSeconds(env.JWT_ACCESS_TTL),
  };
  return cached;
}

/** For tests: reset cached config. */
export function resetConfig() {
  cached = null;
}

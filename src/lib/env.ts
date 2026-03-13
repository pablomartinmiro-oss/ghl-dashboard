import { z } from "zod";

const envSchema = z.object({
  // App
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  // Database
  DATABASE_URL: z.string().startsWith("postgresql://"),

  // Redis
  REDIS_URL: z.string().startsWith("redis"),

  // GHL
  GHL_CLIENT_ID: z.string().min(1),
  GHL_CLIENT_SECRET: z.string().min(1),
  GHL_REDIRECT_URI: z.string().url(),
  GHL_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Encryption
  ENCRYPTION_KEY: z.string().length(64), // 32 bytes hex-encoded

  // Feature flags
  ENABLE_NOTIFICATIONS: z.enum(["true", "false"]).default("true"),
  ENABLE_WEBHOOK_LOGGING: z.enum(["true", "false"]).default("true"),
  ENABLE_MOCK_GHL: z.enum(["true", "false"]).default("false"),

  // Optional
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  BOT_TOKEN: z.string().regex(/^\d+:[\w-]+$/, "Expected Telegram bot token <digits>:<secret>"),
  INIT_DATA_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(86_400),
});

export type Env = z.infer<typeof envSchema>;

/** Parses environment variables; throws with a readable list of problems. Secrets are never echoed. */
export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${problems}`);
  }

  return result.data;
}

import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1),
    APP_TIMEZONE: z.string().min(1).default("America/Sao_Paulo"),

    AUTH_MODE: z.enum(["proxy", "dev"]).default("proxy"),
    AUTH_JWKS_URL: z.url().optional(),
    AUTH_ISSUER: z.string().min(1).optional(),
    AUTH_AUDIENCE: z.string().min(1).optional(),
    AUTH_IDENTITY_HEADER: z.string().min(1).default("cf-access-jwt-assertion"),

    DATA_PROVIDER: z.enum(["pluggy", "mock"]).default("mock"),
    PLUGGY_CLIENT_ID: z.string().min(1).optional(),
    PLUGGY_CLIENT_SECRET: z.string().min(1).optional(),

    WEBHOOK_SECRET: z.string().min(16),
    WEBHOOK_PUBLIC_URL: z.url().optional(),

    RECONCILE_CRON: z.string().default("0 */4 * * *"),
    SNAPSHOT_CRON: z.string().default("0 6 * * *"),
  })
  .superRefine((value, ctx) => {
    if (value.AUTH_MODE === "dev" && value.NODE_ENV === "production") {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_MODE"],
        message: "AUTH_MODE=dev is not allowed when NODE_ENV=production",
      });
    }
    if (
      value.AUTH_MODE === "proxy" &&
      (!value.AUTH_JWKS_URL || !value.AUTH_ISSUER || !value.AUTH_AUDIENCE)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_JWKS_URL"],
        message: "AUTH_JWKS_URL, AUTH_ISSUER and AUTH_AUDIENCE are required when AUTH_MODE=proxy",
      });
    }
    if (
      value.DATA_PROVIDER === "pluggy" &&
      (!value.PLUGGY_CLIENT_ID || !value.PLUGGY_CLIENT_SECRET)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["PLUGGY_CLIENT_ID"],
        message: "PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET are required when DATA_PROVIDER=pluggy",
      });
    }
    if (value.DATA_PROVIDER === "pluggy" && !value.WEBHOOK_PUBLIC_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["WEBHOOK_PUBLIC_URL"],
        message: "WEBHOOK_PUBLIC_URL is required when DATA_PROVIDER=pluggy",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

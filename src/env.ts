import { Buffer } from "node:buffer";
import { z } from "zod";

type Provider = "localai" | "ollama" | "huggingface_inference" | "google";

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

const serverSchema = z
  .object({
    SUPABASE_SERVICE_ROLE_KEY: z
      .string()
      .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
    AI_PROVIDER: z.enum([
      "localai",
      "ollama",
      "huggingface_inference",
      "google",
    ]),
    AI_URL: z.string().url("AI_URL must be a valid URL"),
    AI_SERVER_API_KEY: z.string().optional(),
    SUPABASE_EMAIL_FROM: z
      .string()
      .min(1, "SUPABASE_EMAIL_FROM must be defined"),
    DATABASE_URL: z.string().url().optional(),
    HUGGINGFACE_API_KEY: z.string().optional(),
    GOOGLE_AI_STUDIO_API_KEY: z.string().optional(),
    GOOGLE_AI_STUDIO_MODEL: z.string().optional(),
    GOOGLE_AI_STUDIO_EMBEDDING_MODEL: z.string().optional(),
    AI_MODEL: z.string().optional(),
    AI_EMBEDDING_MODEL: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),
    OCR_PROVIDER: z.enum(["gemini"]).optional(),
    OCR_MODEL: z.string().optional(),
    OCR_BATCH_SIZE: z.coerce.number().int().min(1).max(20).optional(),
    OCR_MAX_PAGES: z.coerce.number().int().min(1).optional(),
    OCR_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).optional(),
    OCR_LANGUAGE_HINT: z.string().optional(),
    OCR_KEYS_STRATEGY: z.enum(["global", "per_org", "per_user"]).optional(),
    OCR_MAX_BATCHES_PER_TICK: z.coerce.number().int().min(1).max(10).optional(),
    SUPABASE_STORAGE_BUCKET_REQUIREMENTS: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).optional(),
    JIRA_BASE_URL: z.string().url().optional(),
    JIRA_API_EMAIL: z.string().email().optional(),
    JIRA_API_TOKEN: z.string().optional(),
    MAX_UPLOADS_PER_DAY: z.coerce.number().int().min(0).optional(),
    UPLOAD_LIMIT_EXCEPTIONS: z.string().optional(),
    CREDENTIAL_ENCRYPTION_KEY: z
      .string()
      .min(1, "CREDENTIAL_ENCRYPTION_KEY is required")
      .superRefine((value, ctx) => {
        try {
          const decoded = Buffer.from(value, "base64");
          if (decoded.length !== 32) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "CREDENTIAL_ENCRYPTION_KEY must be a base64 string that decodes to 32 bytes",
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "CREDENTIAL_ENCRYPTION_KEY must be valid base64",
          });
        }
      }),
  })
  .superRefine((data, ctx) => {
    if (
      data.AI_PROVIDER === "huggingface_inference" &&
      !data.HUGGINGFACE_API_KEY
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "HUGGINGFACE_API_KEY is required when AI_PROVIDER is huggingface_inference",
        path: ["HUGGINGFACE_API_KEY"],
      });
    }

    if (
      data.AI_PROVIDER === "huggingface_inference" &&
      !data.AI_SERVER_API_KEY
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "AI_SERVER_API_KEY is required when AI_PROVIDER is huggingface_inference",
        path: ["AI_SERVER_API_KEY"],
      });
    }

    if (data.AI_PROVIDER === "google" && !data.GOOGLE_AI_STUDIO_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "GOOGLE_AI_STUDIO_API_KEY is required when AI_PROVIDER is google",
        path: ["GOOGLE_AI_STUDIO_API_KEY"],
      });
    }
  });

const rawClientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

const rawServerEnv = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
  AI_URL: process.env.AI_URL,
  AI_SERVER_API_KEY: process.env.AI_SERVER_API_KEY,
  SUPABASE_EMAIL_FROM: process.env.SUPABASE_EMAIL_FROM,
  DATABASE_URL: process.env.DATABASE_URL,
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
  GOOGLE_AI_STUDIO_API_KEY: process.env.GOOGLE_AI_STUDIO_API_KEY,
  GOOGLE_AI_STUDIO_MODEL: process.env.GOOGLE_AI_STUDIO_MODEL,
  GOOGLE_AI_STUDIO_EMBEDDING_MODEL:
    process.env.GOOGLE_AI_STUDIO_EMBEDDING_MODEL,
  AI_MODEL: process.env.AI_MODEL,
  AI_EMBEDDING_MODEL: process.env.AI_EMBEDDING_MODEL,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  OCR_PROVIDER: process.env.OCR_PROVIDER,
  OCR_MODEL: process.env.OCR_MODEL,
  OCR_BATCH_SIZE: process.env.OCR_BATCH_SIZE,
  OCR_MAX_PAGES: process.env.OCR_MAX_PAGES,
  OCR_CONFIDENCE_THRESHOLD: process.env.OCR_CONFIDENCE_THRESHOLD,
  OCR_LANGUAGE_HINT: process.env.OCR_LANGUAGE_HINT,
  OCR_KEYS_STRATEGY: process.env.OCR_KEYS_STRATEGY,
  OCR_MAX_BATCHES_PER_TICK: process.env.OCR_MAX_BATCHES_PER_TICK,
  SUPABASE_STORAGE_BUCKET_REQUIREMENTS:
    process.env.SUPABASE_STORAGE_BUCKET_REQUIREMENTS,
  CRON_SECRET: process.env.CRON_SECRET,
  APP_URL: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  AI_REQUEST_TIMEOUT_MS: process.env.AI_REQUEST_TIMEOUT_MS,
  JIRA_BASE_URL: process.env.JIRA_BASE_URL,
  JIRA_API_EMAIL: process.env.JIRA_API_EMAIL,
  JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
  MAX_UPLOADS_PER_DAY: process.env.MAX_UPLOADS_PER_DAY,
  UPLOAD_LIMIT_EXCEPTIONS: process.env.UPLOAD_LIMIT_EXCEPTIONS,
  CREDENTIAL_ENCRYPTION_KEY: process.env.CREDENTIAL_ENCRYPTION_KEY,
};

type ClientEnv = z.infer<typeof clientSchema>;
type ServerEnv = z.infer<typeof serverSchema>;

const publicEnv: ClientEnv = clientSchema.parse(rawClientEnv);
const isServerRuntime = typeof window === "undefined";

const privateEnv: ServerEnv = isServerRuntime
  ? serverSchema.parse(rawServerEnv)
  : ({} as ServerEnv);

export const env: ClientEnv & Partial<ServerEnv> = {
  ...publicEnv,
  ...(isServerRuntime ? privateEnv : {}),
};

export const clientEnv = publicEnv;
export const serverEnv = privateEnv;
export type AiProvider = Provider;

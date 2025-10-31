import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import {
  getProjectRole,
  requireAuthenticatedUser,
} from "@/lib/auth";
import {
  createDocumentPages,
  createRequirementDocument,
  getDocumentById,
} from "@/lib/data/requirements";
import { getPdfPageCount } from "@/lib/pdf/extract";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { POST as runOcrTick } from "@/app/api/jobs/tick/route";
import { assertValidCsrf } from "@/lib/security/verify-csrf";

const DEFAULT_MAX_PAGES = 100;
const DEFAULT_DAILY_UPLOAD_LIMIT = 2;

type UploadLimitOverrides = Map<string, number>;

const ingestRequestSchema = z.object({
  projectId: z.string().uuid(),
  documentName: z
    .string()
    .min(1, "documentName is required")
    .max(200, "documentName must be ≤ 200 characters"),
  storagePath: z
    .string()
    .min(1, "storagePath is required")
    .max(500, "storagePath must be ≤ 500 characters"),
  storageBucket: z
    .string()
    .min(1, "storageBucket is required")
    .max(120, "storageBucket must be ≤ 120 characters"),
  pages: z.number().int().positive().max(600).optional(),
  language: z.string().max(16).optional().nullable(),
  sourceHash: z
    .string()
    .regex(/^[a-f0-9]{16,128}$/i, "sourceHash must be hex")
    .optional()
    .nullable(),
});


function normalizeOverrideKey(value?: string | null) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed;
}

function computeDefaultDailyLimit(): number {
  const configured = env.MAX_UPLOADS_PER_DAY;

  if (typeof configured === "number" && !Number.isNaN(configured)) {
    if (!Number.isFinite(configured) || configured <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.floor(configured);
  }

  return DEFAULT_DAILY_UPLOAD_LIMIT;
}

function parseUploadLimitOverrides(raw?: string | null): UploadLimitOverrides {
  const overrides: UploadLimitOverrides = new Map();

  if (!raw) {
    return overrides;
  }

  for (const entry of raw.split(",")) {
    const token = entry.trim();
    if (!token) {
      continue;
    }

    const [keyPart, limitPart] = token.split(":");
    const normalizedKey = normalizeOverrideKey(keyPart);

    if (!normalizedKey) {
      continue;
    }

    if (limitPart === undefined || limitPart.trim() === "") {
      overrides.set(normalizedKey, Number.POSITIVE_INFINITY);
      continue;
    }

    const parsed = Number(limitPart.trim());
    if (!Number.isFinite(parsed)) {
      continue;
    }

    overrides.set(
      normalizedKey,
      parsed <= 0 ? Number.POSITIVE_INFINITY : Math.floor(parsed),
    );
  }

  return overrides;
}

function getUtcStartOfDayIso(reference: Date = new Date()) {
  return new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
    ),
  ).toISOString();
}

function getUtcStartOfNextDayIso(reference: Date = new Date()) {
  return new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate() + 1,
    ),
  ).toISOString();
}

function sanitizeDocumentName(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").trim();
}

async function resolveDocumentMetadata(
  bucket: string,
  path: string,
  providedPages?: number,
  providedHash?: string | null,
) {
  if (providedPages && providedPages > 0) {
    return {
      pages: providedPages,
      sourceHash: providedHash ?? null,
    };
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    throw new Error(
      `Unable to download document for metadata extraction: ${error?.message ?? "unknown error"}`,
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  const pages = await getPdfPageCount(arrayBuffer);
  const hash = createHash("sha256")
    .update(Buffer.from(arrayBuffer))
    .digest("hex");

  return {
    pages,
    sourceHash: providedHash ?? hash,
  };
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    await await assertValidCsrf(request);

    const raw = await request.json().catch(() => null);
    const parsed = ingestRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;

    const role = await getProjectRole(body.projectId, user.id);
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const defaultLimit = computeDefaultDailyLimit();
    const overrides = parseUploadLimitOverrides(env.UPLOAD_LIMIT_EXCEPTIONS);
    const overrideKeys = [
      normalizeOverrideKey(user.email),
      normalizeOverrideKey(user.id),
    ].filter(Boolean) as string[];

    let effectiveLimit = defaultLimit;
    for (const key of overrideKeys) {
      const override = overrides.get(key);
      if (typeof override === "number") {
        effectiveLimit = override;
        break;
      }
    }

    if (Number.isFinite(effectiveLimit)) {
      const quotaClient = createSupabaseServiceRoleClient();
      const { count, error } = await quotaClient
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("uploaded_by", user.id)
        .gte("created_at", getUtcStartOfDayIso());

      if (error) {
        console.error("Failed to enforce upload limit", error);
        return NextResponse.json(
          { error: "Unable to verify upload quota" },
          { status: 500 },
        );
      }

      const used = count ?? 0;
      if (used >= effectiveLimit) {
        return NextResponse.json(
          {
            error: "Daily upload limit reached",
            limit: effectiveLimit,
            used,
            resetAt: getUtcStartOfNextDayIso(),
          },
          { status: 429 },
        );
      }
    }

    const { pages, sourceHash } = await resolveDocumentMetadata(
      body.storageBucket,
      body.storagePath,
      body.pages ?? undefined,
      body.sourceHash ?? null,
    );

    const maxPages = env.OCR_MAX_PAGES ?? DEFAULT_MAX_PAGES;
    if (pages <= 0 || pages > maxPages) {
      return NextResponse.json(
        { error: `Document pages must be between 1 and ${maxPages}` },
        { status: 400 },
      );
    }

    const document = await createRequirementDocument({
      project_id: body.projectId,
      name: sanitizeDocumentName(body.documentName),
      storage_bucket: body.storageBucket,
      storage_path: body.storagePath,
      pages,
      language: body.language ?? null,
      source_hash: sourceHash,
      status: "queued",
      uploaded_by: user.id,
    });

    const pagePayload = Array.from({ length: pages }).map((_, index) => ({
      document_id: document.id,
      page_number: index + 1,
      status: "queued",
    }));

    await createDocumentPages(pagePayload);

    let processingSummary: TickSummary | null = null;

    const headers = new Headers({
      "Content-Type": "application/json",
    });

    if (env.CRON_SECRET) {
      headers.set("Authorization", `Bearer ${env.CRON_SECRET}`);
    }

    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await runOcrTick(
          new Request("http://internal/api/jobs/tick", {
            method: "POST",
            headers,
          }),
        );
        if (!response.ok) {
          console.error(
            "Immediate OCR tick returned non-OK status",
            response.status,
          );
          break;
        }
        const payload = (await response.json()) as TickSummary;
        processingSummary = payload;

        const processed = payload?.processedBatches ?? 0;
        const hadErrors = Array.isArray(payload?.errors) && payload.errors.length > 0;

        if (processed === 0 || hadErrors) {
          break;
        }
      }
    } catch (tickError) {
      console.error("Immediate OCR processing failed", tickError);
    }

    const latestDocument = await getDocumentById(document.id);

    return NextResponse.json({
      documentId: document.id,
      pages,
      document: latestDocument,
      processing: processingSummary,
    });
  } catch (error) {
    console.error("Ingest error", error);
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (error.message === "Invalid CSRF token") {
        return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
type TickSummary = {
  status: string;
  processedBatches: number;
  candidatesInserted: number;
  errors: string[];
};

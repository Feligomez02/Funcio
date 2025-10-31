import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import {
  getProjectRole,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { assertValidCsrf } from "@/lib/security/verify-csrf";

const signRequestSchema = z.object({
  projectId: z.string().uuid(),
  fileName: z.string().min(1).max(200),
  contentType: z
    .string()
    .regex(/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i, "contentType must be a valid MIME type")
    .optional(),
});

type SignRequestBody = z.infer<typeof signRequestSchema>;

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const DEFAULT_BUCKET = "documents";

export async function POST(request: Request) {
  try {
    await await assertValidCsrf(request);

    const raw = await request.json().catch(() => null);
    const parsed = signRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body: SignRequestBody = parsed.data;

    const user = await requireAuthenticatedUser();
    const role = await getProjectRole(body.projectId, user.id);

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bucket =
      env.SUPABASE_STORAGE_BUCKET_REQUIREMENTS ?? DEFAULT_BUCKET;

    const supabase = createSupabaseServiceRoleClient();
    const normalizedFileName = sanitizeFileName(body.fileName);
    if (!normalizedFileName) {
      return NextResponse.json(
        { error: "File name contains no valid characters" },
        { status: 400 },
      );
    }
    const storagePath = [
      "requirements",
      body.projectId,
      `${Date.now()}-${normalizedFileName}`,
    ].join("/");

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (error || !data?.signedUrl || !data?.path) {
      console.error("Failed to create signed upload URL", error);
      return NextResponse.json(
        { error: "Unable to create signed upload URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      bucket,
      path: data.path,
      signedUrl: data.signedUrl,
      contentType: body.contentType ?? "application/pdf",
    });
  } catch (error) {
    console.error("Upload sign error", error);
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

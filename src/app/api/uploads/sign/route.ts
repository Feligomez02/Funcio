import { NextResponse } from "next/server";
import { env } from "@/env";
import {
  getProjectRole,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type SignRequestBody = {
  projectId: string;
  fileName: string;
  contentType?: string;
};

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
    const body = (await request.json()) as SignRequestBody;

    if (!body?.projectId || !body?.fileName) {
      return NextResponse.json(
        { error: "projectId and fileName are required" },
        { status: 400 },
      );
    }

    const user = await requireAuthenticatedUser();
    const role = await getProjectRole(body.projectId, user.id);

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bucket =
      env.SUPABASE_STORAGE_BUCKET_REQUIREMENTS ?? DEFAULT_BUCKET;

    const supabase = createSupabaseServiceRoleClient();
    const normalizedFileName = sanitizeFileName(body.fileName);
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
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

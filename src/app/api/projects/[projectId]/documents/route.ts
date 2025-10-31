import { NextResponse } from "next/server";
import {
  getProjectRole,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

function getUtcStartOfDayIso(reference: Date = new Date()) {
  return new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
    ),
  ).toISOString();
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const role = await getProjectRole(projectId, user.id);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const url = new URL(request.url);
    const includeHidden = url.searchParams.get("includeHidden") === "true";
    const includeHistory = url.searchParams.get("includeHistory") === "true";

    const todayStartIso = getUtcStartOfDayIso();

    let query = supabase
      .from("documents")
      .select(
        "id,name,status,created_at,uploaded_by,batches_processed,candidates_imported,last_ocr_error,hidden_at",
      )
      .eq("project_id", projectId);

    if (!includeHidden) {
      query = query.is("hidden_at", null);
    }

    if (!includeHistory) {
      query = query.or(
        `status.neq.completed,created_at.gte.${todayStartIso}`,
      );
    }

    const { data: documents, error: documentsError } = await query
      .order("created_at", { ascending: false })
      .limit(40);

    if (documentsError) {
      console.error("Failed to load documents", documentsError);
      return NextResponse.json(
        { error: "Failed to load documents" },
        { status: 500 },
      );
    }

    const documentIds = (documents ?? []).map((doc) => doc.id);
    const candidateStatusCounts: Record<string, Record<string, number>> = {};

    if (documentIds.length > 0) {
      const { data: candidateRows, error: candidatesError } = await supabase
        .from("requirement_candidates")
        .select("document_id,status")
        .in("document_id", documentIds);

      if (candidatesError) {
        console.error("Failed to load candidate counts", candidatesError);
        return NextResponse.json(
          { error: "Failed to load candidate counts" },
          { status: 500 },
        );
      }

      for (const row of candidateRows ?? []) {
        const docId = row.document_id;
        const status = row.status ?? "unknown";
        if (!candidateStatusCounts[docId]) {
          candidateStatusCounts[docId] = {};
        }
        candidateStatusCounts[docId][status] =
          (candidateStatusCounts[docId][status] ?? 0) + 1;
      }
    }

    const payload = {
      documents: (documents ?? []).map((doc) => {
        const counts = candidateStatusCounts[doc.id] ?? {};
        const totalCandidates =
          doc.candidates_imported ??
          Object.values(counts).reduce((sum, value) => sum + value, 0);

        return {
          ...doc,
          totalCandidates,
          candidateStatusCounts: counts,
          isRecent: !!doc.created_at && doc.created_at >= todayStartIso,
        };
      }),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to list project documents", error);
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

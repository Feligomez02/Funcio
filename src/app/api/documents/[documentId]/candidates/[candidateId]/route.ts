import { NextResponse } from "next/server";
import {
  getProjectRole,
  requireAuthenticatedUser,
} from "@/lib/auth";
import {
  getCandidateById,
  promoteCandidateToRequirement,
  updateCandidate,
  updateCandidateStatus,
} from "@/lib/data/requirements";
import type { Database } from "@/types/database";

type RouteContext = {
  params: Promise<{ documentId: string; candidateId: string }>;
};

type CandidateAction =
  | {
      action: "update";
      text?: string;
      type?: string | null;
      confidence?: number | null;
      rationale?: string | null;
    }
  | {
      action: "approve";
      title: string;
      description: string;
      type?: string | null;
      priority?: number | null;
      status?: string | null;
    }
  | {
      action: "reject";
    };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { documentId, candidateId } = await context.params;

    const candidate = await getCandidateById(candidateId);
    if (!candidate || candidate.document_id !== documentId) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const role = await getProjectRole(candidate.project_id, user.id);
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CandidateAction;
    if (!body?.action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    switch (body.action) {
      case "update": {
        const updates: Database["public"]["Tables"]["requirement_candidates"]["Update"] =
          {};
        if (typeof body.text === "string") updates.text = body.text;
        if ("type" in body) updates.type = body.type ?? null;
        if ("confidence" in body) updates.confidence = body.confidence ?? null;
        if ("rationale" in body) updates.rationale = body.rationale ?? null;

        const updated = await updateCandidate(candidateId, updates);
        return NextResponse.json({ candidate: updated ?? candidate });
      }
      case "approve": {
        if (!body.title || !body.description) {
          return NextResponse.json(
            { error: "title and description are required to approve" },
            { status: 400 },
          );
        }

        const requirement = await promoteCandidateToRequirement({
          candidate,
          projectId: candidate.project_id,
          userId: user.id,
          title: body.title,
          description: body.description,
          type: body.type ?? candidate.type,
          priority: body.priority ?? null,
          status: body.status ?? "analysis",
        });

        return NextResponse.json({ requirement });
      }
      case "reject": {
        await updateCandidateStatus(candidate.id, "rejected", {
          created_by: user.id,
        });
        return NextResponse.json({ status: "ok" });
      }
      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Candidate update error", error);
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

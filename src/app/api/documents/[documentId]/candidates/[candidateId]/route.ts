import { NextResponse } from "next/server";
import { z } from "zod";
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
import { assertValidCsrf } from "@/lib/security/verify-csrf";

type RouteContext = {
  params: Promise<{ documentId: string; candidateId: string }>;
};

const updateActionSchema = z.object({
  action: z.literal("update"),
  text: z.string().max(6000).optional(),
  type: z.string().max(32).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  rationale: z.string().max(2000).nullable().optional(),
});

const approveActionSchema = z.object({
  action: z.literal("approve"),
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(8000),
  type: z.string().max(32).nullable().optional(),
  priority: z.number().int().min(1).max(5).nullable().optional(),
  status: z.string().max(32).nullable().optional(),
});

const rejectActionSchema = z.object({
  action: z.literal("reject"),
});

const candidateActionSchema = z.discriminatedUnion("action", [
  updateActionSchema,
  approveActionSchema,
  rejectActionSchema,
]);

type CandidateAction = z.infer<typeof candidateActionSchema>;

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { documentId, candidateId } = await context.params;

    await assertValidCsrf(request);

    const candidate = await getCandidateById(candidateId);
    if (!candidate || candidate.document_id !== documentId) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const role = await getProjectRole(candidate.project_id, user.id);
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = candidateActionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body: CandidateAction = parsed.data;

    switch (body.action) {
      case "update": {
        const updates: Database["public"]["Tables"]["requirement_candidates"]["Update"] =
          {};
        if (typeof body.text === "string") {
          updates.text = body.text.trim();
        }
        if (body.type !== undefined) {
          updates.type = body.type ?? null;
        }
        if (body.confidence !== undefined) {
          updates.confidence = body.confidence ?? null;
        }
        if (body.rationale !== undefined) {
          updates.rationale = body.rationale ?? null;
        }

        const updated = await updateCandidate(candidateId, updates);
        return NextResponse.json({ candidate: updated ?? candidate });
      }
      case "approve": {
        const requirement = await promoteCandidateToRequirement({
          candidate,
          projectId: candidate.project_id,
          userId: user.id,
          title: body.title.trim(),
          description: body.description.trim(),
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

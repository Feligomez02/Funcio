import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getProjectRole } from "@/lib/auth";
import {
  updateRequirement,
  getRequirementById,
  deleteRequirement,
} from "@/lib/data/requirements";
import { assertValidCsrf } from "@/lib/security/verify-csrf";

const patchSchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID"),
  description: z.string().min(10).max(6000).optional(),
  title: z.string().min(3).max(200).optional(),
  type: z.string().max(50).optional().nullable(),
  status: z.string().max(50).optional().nullable(),
  priority: z.number().min(1).max(5).optional().nullable(),
  aiUserStory: z.string().max(4000).optional().nullable(),
  aiAcceptanceCriteria: z.array(z.string().max(2000)).optional().nullable(),
  aiIssues: z.array(z.string().max(2000)).optional().nullable(),
  aiConfidence: z.number().min(0).max(1).optional().nullable(),
  aiProvider: z.string().max(100).optional().nullable(),
  aiLanguage: z.string().max(100).optional().nullable(),
  aiTokensUsed: z.number().int().nonnegative().optional().nullable(),
  aiTypeSuggestion: z.string().max(50).optional().nullable(),
  aiTypeConfidence: z.number().min(0).max(1).optional().nullable(),
  aiTypeReason: z.string().max(500).optional().nullable(),
  changeNote: z.string().max(500).optional().nullable(),
});

const deleteSchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID"),
  reason: z.string().max(500).optional().nullable(),
});

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ requirementId: string }> }
) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requirementId } = await params;

  if (!requirementId) {
    return NextResponse.json({ error: "Missing requirementId" }, { status: 400 });
  }

  try {
    await assertValidCsrf(request);
  } catch {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const role = await getProjectRole(parsed.data.projectId, session.user.id);

  if (!role || (role !== "analyst" && role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await getRequirementById(requirementId);

  if (!existing || existing.project_id !== parsed.data.projectId) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  const currentType = existing.type ?? null;
  const nextType = "type" in parsed.data ? parsed.data.type ?? null : currentType;
  const trimmedChangeNote = (parsed.data.changeNote ?? "").trim();

  if (nextType !== currentType && trimmedChangeNote.length === 0) {
    return NextResponse.json(
      { error: "Change note required when updating requirement type." },
      { status: 400 }
    );
  }

  const updated = await updateRequirement({
    requirementId,
    projectId: parsed.data.projectId,
    updates: {
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type ?? null,
      status: parsed.data.status ?? null,
      priority: parsed.data.priority ?? null,
      ai_user_story: parsed.data.aiUserStory ?? null,
      ai_acceptance_criteria: parsed.data.aiAcceptanceCriteria ?? null,
      ai_issues: parsed.data.aiIssues ?? null,
      ai_confidence: parsed.data.aiConfidence ?? null,
      ai_provider: parsed.data.aiProvider ?? null,
      ai_language: parsed.data.aiLanguage ?? null,
      ai_tokens_used: parsed.data.aiTokensUsed ?? null,
      ...(parsed.data.aiTypeSuggestion !== undefined
        ? { ai_type_suggestion: parsed.data.aiTypeSuggestion ?? null }
        : {}),
      ...(parsed.data.aiTypeConfidence !== undefined
        ? { ai_type_confidence: parsed.data.aiTypeConfidence ?? null }
        : {}),
      ...(parsed.data.aiTypeReason !== undefined
        ? { ai_type_reason: parsed.data.aiTypeReason ?? null }
        : {}),
    },
    updatedBy: session.user.id,
    changeNote: trimmedChangeNote.length > 0 ? trimmedChangeNote : null,
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Unable to update requirement" },
      { status: 500 }
    );
  }

  return NextResponse.json(updated);
};

export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ requirementId: string }> }
) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requirementId } = await params;

  if (!requirementId) {
    return NextResponse.json({ error: "Missing requirementId" }, { status: 400 });
  }

  try {
    await assertValidCsrf(request);
  } catch {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const role = await getProjectRole(parsed.data.projectId, session.user.id);

  if (!role || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await getRequirementById(requirementId);

  if (!existing || existing.project_id !== parsed.data.projectId) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  const wasDeleted = await deleteRequirement({
    requirementId,
    projectId: parsed.data.projectId,
    deletedBy: session.user.id,
    reason: (parsed.data.reason ?? "").trim() || null,
  });

  if (!wasDeleted) {
    return NextResponse.json(
      { error: "Unable to delete requirement" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
};

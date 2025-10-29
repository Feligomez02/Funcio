import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getProjectRole } from "@/lib/auth";
import { getProjectById } from "@/lib/data/projects";
import {
  getRecentRequirementsForProject,
  getRequirementById,
  updateRequirement,
} from "@/lib/data/requirements";
import { createEmbeddings, improveRequirement } from "@/lib/ai/providers";
import { consumeRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";

const LANGUAGE_OPTIONS = ["english", "spanish", "portuguese"] as const;

const requestSchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID"),
  requirementId: z.string().uuid("requirementId must be a valid UUID").nullable(),
  text: z.string().min(10).max(6000),
  language: z.enum(LANGUAGE_OPTIONS).optional(),
});

export const POST = async (request: Request) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const rateLimit = consumeRateLimit(`ai-improve:${session.user.id}`);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: rateLimit.retryAfter,
      },
      { status: 429 }
    );
  }

  const role = await getProjectRole(parsed.data.projectId, session.user.id);

  if (!role || (role !== "analyst" && role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const language = parsed.data.language ?? "english";

  const project = await getProjectById(parsed.data.projectId);
  const targetRequirement = parsed.data.requirementId
    ? await getRequirementById(parsed.data.requirementId)
    : null;
  const recentRequirements = await getRecentRequirementsForProject(
    parsed.data.projectId
  );

  const result = await improveRequirement({
    projectSummary: project?.description ?? null,
    recentRequirements: recentRequirements.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
    })),
    text: parsed.data.text,
    language,
    currentType: targetRequirement?.type ?? null,
  });

  let embedding: Awaited<ReturnType<typeof createEmbeddings>> | null = null;

  try {
    embedding = await createEmbeddings({ text: result.improvedText });
  } catch (error) {
    console.error("Unable to generate embedding for AI improvement", error);
  }

  await logAuditEvent({
    userId: session.user.id,
    action: "ai.improve.invoke",
    entity: "requirement",
    entityId: parsed.data.requirementId ?? undefined,
    payload: {
      projectId: parsed.data.projectId,
      provider: result.provider,
      language,
    },
  });

  if (parsed.data.requirementId) {
    try {
      await updateRequirement({
        requirementId: parsed.data.requirementId,
        projectId: parsed.data.projectId,
        updates: {
          ai_type_suggestion: result.typeSuggestion ?? null,
          ai_type_confidence: result.typeConfidence ?? null,
          ai_type_reason: result.typeReason ?? null,
        },
        updatedBy: session.user.id,
      });
    } catch (error) {
      console.error("Unable to store AI requirement type suggestion", error);
    }
  }

  return NextResponse.json({
    ...result,
    embedding,
  });
};

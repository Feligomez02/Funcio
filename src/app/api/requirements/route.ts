import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getProjectRole } from "@/lib/auth";
import { listRequirements, createRequirement } from "@/lib/data/requirements";
import { assertValidCsrf } from "@/lib/security/verify-csrf";

const querySchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID"),
});

const createRequirementSchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID"),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  type: z.string().max(50).optional().nullable(),
  priority: z.number().min(1).max(5).optional().nullable(),
  status: z.string().max(50).optional().nullable(),
  aiUserStory: z.string().max(4000).optional().nullable(),
  aiAcceptanceCriteria: z.array(z.string().max(2000)).optional().nullable(),
  aiIssues: z.array(z.string().max(2000)).optional().nullable(),
  aiConfidence: z.number().min(0).max(1).optional().nullable(),
  aiProvider: z.string().max(100).optional().nullable(),
  aiLanguage: z.string().max(100).optional().nullable(),
  aiTokensUsed: z.number().int().nonnegative().optional().nullable(),
});

export const GET = async (request: Request) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raw = Object.fromEntries(searchParams.entries());
  const parsed = querySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const role = await getProjectRole(parsed.data.projectId, session.user.id);

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requirements = await listRequirements(parsed.data.projectId);
  return NextResponse.json(requirements);
};

export const POST = async (request: Request) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await await assertValidCsrf(request);
  } catch {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = createRequirementSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const role = await getProjectRole(parsed.data.projectId, session.user.id);

  if (!role || (role !== "admin" && role !== "analyst")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requirement = await createRequirement({
    projectId: parsed.data.projectId,
    title: parsed.data.title.trim(),
    description: parsed.data.description.trim(),
    type: parsed.data.type?.trim() ?? null,
    priority: parsed.data.priority ?? 3,
    status: parsed.data.status?.trim() ?? "analysis",
    createdBy: session.user.id,
    aiUserStory: parsed.data.aiUserStory ?? null,
    aiAcceptanceCriteria: parsed.data.aiAcceptanceCriteria ?? null,
    aiIssues: parsed.data.aiIssues ?? null,
    aiConfidence: parsed.data.aiConfidence ?? null,
    aiProvider: parsed.data.aiProvider ?? null,
    aiLanguage: parsed.data.aiLanguage ?? null,
    aiTokensUsed: parsed.data.aiTokensUsed ?? null,
  });

  if (!requirement) {
    return NextResponse.json(
      { error: "Unable to create requirement" },
      { status: 500 }
    );
  }

  return NextResponse.json(requirement, { status: 201 });
};

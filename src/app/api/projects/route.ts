import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { listProjectsForUser, createProject } from "@/lib/data/projects";
import { assertValidCsrf } from "@/lib/security/verify-csrf";

const createProjectSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().max(500).optional().nullable(),
});

export const GET = async () => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await listProjectsForUser(session.user.id);
  return NextResponse.json(projects);
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

  const parseResult = createProjectSchema.safeParse(raw);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const project = await createProject({
    name: parseResult.data.name.trim(),
    description: parseResult.data.description?.trim() ?? null,
    ownerId: session.user.id,
  });

  if (!project) {
    return NextResponse.json(
      { error: "Unable to create project" },
      { status: 500 }
    );
  }

  return NextResponse.json(project, { status: 201 });
};

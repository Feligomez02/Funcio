import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getProjectRole } from "@/lib/auth";
import { getProjectById } from "@/lib/data/projects";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { logAuditEvent } from "@/lib/audit";

const patchSchema = z.object({
  name: z.string().trim().min(3).max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value === undefined ? undefined : value)),
});

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const project = await getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const role = await getProjectRole(projectId, session.user.id);

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceRoleClient();

  const trimmedName = parsed.data.name.trim();
  const trimmedDescription =
    parsed.data.description && parsed.data.description.trim().length > 0
      ? parsed.data.description.trim()
      : null;

  const { data, error } = await supabase
    .from("projects")
    .update({
      name: trimmedName,
      description: trimmedDescription,
    })
    .eq("id", projectId)
    .select()
    .single();

  if (error || !data) {
    console.error("Unable to update project", error);
    return NextResponse.json({ error: "Unable to update project" }, { status: 500 });
  }

  await logAuditEvent({
    userId: session.user.id,
    action: "project.updated",
    entity: "project",
    entityId: projectId,
    payload: {
      name: trimmedName,
    },
  });

  const updated = data as { id: string; name: string | null; description: string | null };

  return NextResponse.json({
    project: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
    },
  });
};

export const DELETE = async (
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const project = await getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const role = await getProjectRole(projectId, session.user.id);

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Unable to delete project", error);
    return NextResponse.json({ error: "Unable to delete project" }, { status: 500 });
  }

  if (data) {
    await logAuditEvent({
      userId: session.user.id,
      action: "project.deleted",
      entity: "project",
      entityId: projectId,
      payload: {
        name: (data as { name?: string | null })?.name ?? project.name,
      },
    });
  }

  return NextResponse.json({ success: true });
};

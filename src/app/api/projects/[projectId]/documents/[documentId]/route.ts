import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getProjectRole,
  requireAuthenticatedUser,
} from "@/lib/auth";
import {
  getDocumentById,
  setDocumentHiddenState,
} from "@/lib/data/requirements";
import { getProjectById } from "@/lib/data/projects";
import { assertValidCsrf } from "@/lib/security/verify-csrf";

type RouteContext = {
  params: Promise<{ projectId: string; documentId: string }>;
};

const bodySchema = z.object({
  hidden: z.boolean(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectId, documentId } = await context.params;

    if (!projectId || !documentId) {
      return NextResponse.json(
        { error: "Missing projectId or documentId" },
        { status: 400 },
      );
    }

    const user = await requireAuthenticatedUser();
    const document = await getDocumentById(documentId);
    if (!document || document.project_id !== projectId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const role = await getProjectRole(projectId, user.id);
    const isOwner = project.owner_id === user.id;

    if (role !== "admin" && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      await assertValidCsrf(request);
    } catch {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const payload = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await setDocumentHiddenState(documentId, parsed.data.hidden);

    const updated = await getDocumentById(documentId);

    return NextResponse.json({
      document: updated,
    });
  } catch (error) {
    console.error("Failed to update document visibility", error);
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

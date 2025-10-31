import { NextResponse } from "next/server";
import { getSession, getProjectRole } from "@/lib/auth";
import { getRequirementById } from "@/lib/data/requirements";
import { deleteRequirementLink } from "@/lib/data/requirement-links";
import { assertValidCsrf } from "@/lib/security/verify-csrf";

export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ requirementId: string; linkId: string }> }
) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requirementId, linkId } = await params;

  if (!requirementId || !linkId) {
    return NextResponse.json({ error: "Missing identifiers" }, { status: 400 });
  }

  const requirement = await getRequirementById(requirementId);

  if (!requirement) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  const role = await getProjectRole(requirement.project_id, session.user.id);

  const canManage = role === "admin" || role === "analyst";

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await assertValidCsrf(request);
  } catch {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const result = await deleteRequirementLink({
    linkId,
    requirementId,
    projectId: requirement.project_id,
    removedBy: session.user.id,
  });

  if (!result.success) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Unable to delete link" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
};
